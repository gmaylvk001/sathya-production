import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import SathyaProd from "@/models/sathya_prod";
import { cell, normalizeRows } from "../_helpers";

export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 300;

const BATCH_SIZE = 5000;

function logIssue(type, rowNumber, reason, data = {}) {
  console.warn(
    `[sathya_prod][${type}] Excel row ${rowNumber} | reason: ${reason} | data:`,
    JSON.stringify(data)
  );
}

function printRootCauseSummary(label, issues) {
  const counts = {};
  for (const issue of issues) {
    const key = issue.reason || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log(`\n========== sathya_prod ${label} ROOT CAUSE SUMMARY ==========`);
  console.log(`Total ${label.toLowerCase()}: ${issues.length}`);
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      console.log(`  - ${count}x → ${reason}`);
    });
  console.log("============================================================\n");
}

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const search = (searchParams.get("search") || "").trim();
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { item_code: { $regex: search, $options: "i" } },
        { product_type: { $regex: search, $options: "i" } },
      ];
    }

    const [total, data] = await Promise.all([
      SathyaProd.countDocuments(query),
      SathyaProd.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("sathya_prod list error:", error);
    return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const startedAt = Date.now();

  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("excel");

    if (!file) {
      return NextResponse.json({ error: "Excel or CSV file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      defval: "",
      raw: true,
    });
    const rows = normalizeRows(rawRows);

    if (!rows.length) {
      return NextResponse.json({ error: "No data found in file." }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      detected_headers: Object.keys(rows[0] || {}),
      total_rows: rows.length,
    };

    console.log("\n========== sathya_prod UPLOAD START ==========");
    console.log(`File: ${file.name || "unknown"}`);
    console.log(`Total Excel rows: ${rows.length}`);
    console.log(`Detected headers: ${results.detected_headers.join(", ")}`);
    console.log("=============================================\n");

    const ops = [];
    const opMeta = [];
    const seenIds = new Set();
    const skippedIssues = [];
    const failedIssues = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const id = cell(row, "id");
        const item_code = cell(row, "item_code");
        const product_type = cell(row, "product_type");

        if (!id) throw new Error("id is required (empty/missing)");
        if (!item_code) throw new Error("item_code is required (empty/missing)");

        if (seenIds.has(id)) {
          const reason = `duplicate id in Excel file (id=${id} already seen earlier)`;
          results.skipped++;
          skippedIssues.push({ row: rowNumber, reason, data: { id, item_code, product_type } });
          logIssue("SKIPPED", rowNumber, reason, { id, item_code, product_type });
          continue;
        }
        seenIds.add(id);

        const now = new Date();
        ops.push({
          updateOne: {
            filter: { id },
            update: {
              $set: {
                item_code,
                product_type,
                updatedAt: now,
              },
              $setOnInsert: {
                id,
                createdAt: now,
              },
            },
            upsert: true,
          },
        });
        opMeta.push({ id, item_code, product_type, excel_row: rowNumber });
      } catch (error) {
        const reason = error.message || "validation failed";
        results.failed++;
        failedIssues.push({ row: rowNumber, reason, data: row });
        logIssue("FAILED", rowNumber, reason, row);

        if (results.errors.length < 100) {
          results.errors.push({ row: rowNumber, error: reason, data: row });
        }
      }
    }

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      const batchMeta = opMeta.slice(i, i + BATCH_SIZE);
      const batchNo = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const bulkResult = await SathyaProd.collection.bulkWrite(batch, { ordered: false });
        results.created += bulkResult.upsertedCount || 0;
        results.updated += bulkResult.modifiedCount || 0;
        console.log(
          `[sathya_prod] Batch ${batchNo}: upserted=${bulkResult.upsertedCount || 0}, modified=${bulkResult.modifiedCount || 0}`
        );
      } catch (error) {
        const writeErrors = error?.writeErrors || [];
        results.created += error?.result?.nUpserted || 0;
        results.updated += error?.result?.nModified || 0;
        results.failed += writeErrors.length || 0;

        console.error(`[sathya_prod] Batch ${batchNo} bulkWrite error:`, error.message);

        for (const writeError of writeErrors) {
          const meta = batchMeta[writeError.index] || {};
          const reason = writeError.errmsg || writeError.message || "Mongo bulk write failed";
          const rowNumber = meta.excel_row || "batch";

          failedIssues.push({
            row: rowNumber,
            reason,
            data: {
              id: meta.id,
              item_code: meta.item_code,
              product_type: meta.product_type,
            },
          });

          logIssue("FAILED", rowNumber, reason, {
            id: meta.id,
            item_code: meta.item_code,
            product_type: meta.product_type,
          });

          if (results.errors.length < 100) {
            results.errors.push({
              row: rowNumber,
              error: reason,
              data: meta,
            });
          }
        }
      }
    }

    if (skippedIssues.length) printRootCauseSummary("SKIPPED", skippedIssues);
    if (failedIssues.length) printRootCauseSummary("FAILED", failedIssues);

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    console.log("========== sathya_prod UPLOAD DONE ==========");
    console.log(
      `created=${results.created}, updated=${results.updated}, skipped=${results.skipped}, failed=${results.failed}, duration=${seconds}s`
    );
    console.log("=============================================\n");

    return NextResponse.json({
      message: `Products: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed (${seconds}s)`,
      details: {
        ...results,
        duration_seconds: Number(seconds),
        skipped_reasons: skippedIssues.slice(0, 100),
        failed_reasons: failedIssues.slice(0, 100),
      },
    });
  } catch (error) {
    console.error("Products bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to process products bulk upload", details: error.message },
      { status: 500 }
    );
  }
}
