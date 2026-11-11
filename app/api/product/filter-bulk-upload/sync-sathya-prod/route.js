import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SathyaProd from "@/models/sathya_prod";
import Product from "@/models/product";

export const maxDuration = 300;

/**
 * SAFE sync: sathya_prod → products
 * - Match by item_code
 * - Write ONLY: sathya_old_id (from sathya_prod.id) + product_type (only if non-empty)
 * - Default is dry-run (no DB writes)
 * - Apply requires { confirm: true, dryRun: false }
 */

function normalizeItemCode(value) {
  return String(value ?? "").trim();
}

/** Only allow normal / gift — anything else is ignored (not written to products). */
function normalizeProductType(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "normal" || text === "gift") return text;
  return "";
}

export async function POST(req) {
  const startedAt = Date.now();

  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default TRUE
    const confirm = body.confirm === true;

    if (!dryRun && !confirm) {
      return NextResponse.json(
        {
          error:
            "Refusing to apply without confirm:true. Run dry-run first, then call again with { dryRun:false, confirm:true }.",
        },
        { status: 400 }
      );
    }

    console.log("\n========== sathya_prod → products SYNC START ==========");
    console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY (will update products)"}`);

    const sathyaRows = await SathyaProd.find({})
      .select("id item_code product_type")
      .lean();

    console.log(`sathya_prod rows loaded: ${sathyaRows.length}`);

    // Detect duplicate item_codes inside sathya_prod
    const byItemCode = new Map();
    const sathyaDupItemCodes = new Set();

    for (const row of sathyaRows) {
      const itemCode = normalizeItemCode(row.item_code);
      if (!itemCode) continue;

      if (!byItemCode.has(itemCode)) {
        byItemCode.set(itemCode, []);
      }
      byItemCode.get(itemCode).push(row);
    }

    for (const [itemCode, list] of byItemCode.entries()) {
      const uniqueIds = new Set(list.map((r) => String(r.id)));
      if (uniqueIds.size > 1) {
        sathyaDupItemCodes.add(itemCode);
      }
    }

    const itemCodes = [...byItemCode.keys()];

    // Load matching products in one query
    const products = await Product.find({ item_code: { $in: itemCodes } })
      .select("_id item_code sathya_old_id product_type name")
      .lean();

    const productsByItemCode = new Map();
    for (const product of products) {
      const itemCode = normalizeItemCode(product.item_code);
      if (!productsByItemCode.has(itemCode)) {
        productsByItemCode.set(itemCode, []);
      }
      productsByItemCode.get(itemCode).push(product);
    }

    const summary = {
      mode: dryRun ? "dry-run" : "apply",
      sathya_total: sathyaRows.length,
      unique_item_codes: itemCodes.length,
      would_update: 0,
      updated: 0,
      already_same: 0,
      not_found: 0,
      skipped_sathya_duplicate_item_code: 0,
      skipped_multiple_products: 0,
      skipped_conflict_existing_sathya_old_id: 0,
      skipped_empty_item_code: 0,
      product_type_set: 0,
      samples: {
        would_update: [],
        not_found: [],
        conflicts: [],
        multiple_products: [],
        sathya_duplicates: [],
      },
      // Full verification list (all item_codes) — use this to confirm matches
      report: [],
    };

    const bulkOps = [];

    for (const [itemCode, sathyaList] of byItemCode.entries()) {
      // Prefer first row if same id repeated; skip if conflicting ids for same item_code
      if (sathyaDupItemCodes.has(itemCode)) {
        summary.skipped_sathya_duplicate_item_code++;
        const row = {
          status: "SKIP_SATHYA_DUPLICATE_ITEM_CODE",
          item_code: itemCode,
          sathya_id: sathyaList.map((r) => r.id).join("|"),
          product_id: "",
          product_name: "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: "Multiple different sathya ids for same item_code",
        };
        summary.report.push(row);
        if (summary.samples.sathya_duplicates.length < 50) {
          summary.samples.sathya_duplicates.push({
            item_code: itemCode,
            ids: sathyaList.map((r) => r.id),
          });
        }
        console.warn(
          `[SYNC][SKIP] item_code=${itemCode} has multiple different sathya ids: ${sathyaList
            .map((r) => r.id)
            .join(", ")}`
        );
        continue;
      }

      const sathya = sathyaList[0];
      const sathyaOldId = String(sathya.id ?? "").trim();
      const productType = normalizeProductType(sathya.product_type);

      if (!sathyaOldId) {
        summary.report.push({
          status: "SKIP_EMPTY_SATHYA_ID",
          item_code: itemCode,
          sathya_id: "",
          product_id: "",
          product_name: "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: "Empty sathya id",
        });
        console.warn(`[SYNC][SKIP] item_code=${itemCode} has empty sathya id`);
        continue;
      }

      const matchedProducts = productsByItemCode.get(itemCode) || [];

      if (matchedProducts.length === 0) {
        summary.not_found++;
        const row = {
          status: "NOT_FOUND",
          item_code: itemCode,
          sathya_id: sathyaOldId,
          product_id: "",
          product_name: "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: "No product with this item_code",
        };
        summary.report.push(row);
        if (summary.samples.not_found.length < 50) {
          summary.samples.not_found.push({
            item_code: itemCode,
            sathya_id: sathyaOldId,
          });
        }
        continue;
      }

      if (matchedProducts.length > 1) {
        summary.skipped_multiple_products++;
        const row = {
          status: "SKIP_MULTIPLE_PRODUCTS",
          item_code: itemCode,
          sathya_id: sathyaOldId,
          product_id: matchedProducts.map((p) => String(p._id)).join("|"),
          product_name: "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: `Matched ${matchedProducts.length} products`,
        };
        summary.report.push(row);
        if (summary.samples.multiple_products.length < 50) {
          summary.samples.multiple_products.push({
            item_code: itemCode,
            sathya_id: sathyaOldId,
            product_ids: matchedProducts.map((p) => String(p._id)),
            count: matchedProducts.length,
          });
        }
        console.warn(
          `[SYNC][SKIP] item_code=${itemCode} matches ${matchedProducts.length} products — ambiguous`
        );
        continue;
      }

      const product = matchedProducts[0];
      const existingOldId = String(product.sathya_old_id ?? "").trim();
      const existingType = String(product.product_type ?? "").trim();

      // Safety: do not overwrite a different existing sathya_old_id
      if (existingOldId && existingOldId !== sathyaOldId) {
        summary.skipped_conflict_existing_sathya_old_id++;
        const row = {
          status: "CONFLICT_EXISTING_SATHYA_OLD_ID",
          item_code: itemCode,
          sathya_id: sathyaOldId,
          product_id: String(product._id),
          product_name: product.name || "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: `Existing sathya_old_id=${existingOldId}`,
        };
        summary.report.push(row);
        if (summary.samples.conflicts.length < 50) {
          summary.samples.conflicts.push({
            item_code: itemCode,
            product_id: String(product._id),
            existing_sathya_old_id: existingOldId,
            incoming_sathya_old_id: sathyaOldId,
          });
        }
        console.warn(
          `[SYNC][CONFLICT] item_code=${itemCode} product=${product._id} existing sathya_old_id=${existingOldId} != incoming=${sathyaOldId}`
        );
        continue;
      }

      const setFields = {};

      if (!existingOldId) {
        setFields.sathya_old_id = sathyaOldId;
      }

      // Only write product_type when sathya has a non-empty value (e.g. normal/gift)
      if (productType && existingType !== productType) {
        setFields.product_type = productType;
      }

      if (Object.keys(setFields).length === 0) {
        summary.already_same++;
        summary.report.push({
          status: "ALREADY_SAME",
          item_code: itemCode,
          sathya_id: sathyaOldId,
          product_id: String(product._id),
          product_name: product.name || "",
          will_set_sathya_old_id: "",
          will_set_product_type: "",
          note: "Already has same values",
        });
        continue;
      }

      summary.would_update++;
      if (setFields.product_type) summary.product_type_set++;

      const matchRow = {
        status: "MATCHED_WILL_UPDATE",
        item_code: itemCode,
        sathya_id: sathyaOldId,
        product_id: String(product._id),
        product_name: product.name || "",
        will_set_sathya_old_id: setFields.sathya_old_id || "",
        will_set_product_type: setFields.product_type || "",
        note: "Matched by item_code",
      };
      summary.report.push(matchRow);

      if (summary.samples.would_update.length < 50) {
        summary.samples.would_update.push({
          item_code: itemCode,
          product_id: String(product._id),
          product_name: product.name || "",
          set: setFields,
          before: {
            sathya_old_id: existingOldId || "",
            product_type: existingType || "",
          },
        });
      }

      if (!dryRun) {
        bulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: {
                ...setFields,
                updatedAt: new Date(),
              },
            },
          },
        });
      }
    }

    // Count empty item_codes in sathya_prod
    summary.skipped_empty_item_code = sathyaRows.filter(
      (r) => !normalizeItemCode(r.item_code)
    ).length;

    if (!dryRun && bulkOps.length) {
      const BATCH = 2000;
      for (let i = 0; i < bulkOps.length; i += BATCH) {
        const batch = bulkOps.slice(i, i + BATCH);
        const result = await Product.collection.bulkWrite(batch, { ordered: false });
        summary.updated += result.modifiedCount || 0;
        console.log(
          `[SYNC][APPLY] batch ${Math.floor(i / BATCH) + 1}: modified=${result.modifiedCount || 0}`
        );
      }
    }

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    summary.duration_seconds = Number(seconds);

    console.log("========== sathya_prod → products SYNC SUMMARY ==========");
    console.log(JSON.stringify({
      mode: summary.mode,
      would_update: summary.would_update,
      updated: summary.updated,
      already_same: summary.already_same,
      not_found: summary.not_found,
      skipped_sathya_duplicate_item_code: summary.skipped_sathya_duplicate_item_code,
      skipped_multiple_products: summary.skipped_multiple_products,
      skipped_conflict_existing_sathya_old_id: summary.skipped_conflict_existing_sathya_old_id,
      product_type_set: summary.product_type_set,
      duration_seconds: summary.duration_seconds,
    }, null, 2));
    console.log("=========================================================\n");

    return NextResponse.json({
      message: dryRun
        ? `Dry-run complete: ${summary.would_update} products would be updated (${seconds}s). Review terminal + details, then apply with confirm.`
        : `Apply complete: ${summary.updated} products updated (${seconds}s).`,
      details: summary,
    });
  } catch (error) {
    console.error("sathya_prod sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST with { dryRun:true } first. Then { dryRun:false, confirm:true } to apply.",
    safety: [
      "Only updates sathya_old_id and product_type",
      "Matches by item_code",
      "Skips ambiguous duplicates",
      "Does not overwrite a different existing sathya_old_id",
      "product_type written only when value is normal or gift",
    ],
  });
}
