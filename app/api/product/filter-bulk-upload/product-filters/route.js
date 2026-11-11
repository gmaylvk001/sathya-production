import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import SathyaProductFilter from "@/models/sathya_product_filter";
import SathyaProductFilterSkipped from "@/models/sathya_product_filter_skipped";
import { cell, normalizeRows } from "../_helpers";

export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 300;

const BATCH_SIZE = 5000;

async function saveSkippedBatches(docs, results) {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    try {
      const insertResult = await SathyaProductFilterSkipped.collection.insertMany(batch, {
        ordered: false,
      });
      results.skipped_saved += insertResult?.insertedCount || batch.length;
    } catch (error) {
      const inserted = error?.result?.nInserted || error?.insertedCount || 0;
      results.skipped_saved += inserted;
      if (results.errors.length < 50) {
        results.errors.push({
          row: "skipped_batch",
          error: error.message || "Failed saving some skipped rows",
        });
      }
    }
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
      skipped_saved: 0,
      errors: [],
      detected_headers: Object.keys(rows[0] || {}),
      total_rows: rows.length,
    };

    const ops = [];
    const opMeta = []; // parallel to ops: original row info for failed -> skipped
    const skippedDocs = [];
    const seenIds = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const id = cell(row, "id");
        const product_id = cell(row, "product_id");
        const filter_id = cell(row, "filter_id");

        if (!id) throw new Error("id is required");
        if (!product_id) throw new Error("product_id is required");
        if (!filter_id) throw new Error("filter_id is required");

        // First occurrence goes to main DB; later same id -> skipped collection
        if (seenIds.has(id)) {
          results.skipped++;
          skippedDocs.push({
            id,
            product_id,
            filter_id,
            excel_row: rowNumber,
            skip_reason: "duplicate_id_in_file",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          continue;
        }
        seenIds.add(id);

        const now = new Date();
        ops.push({
          updateOne: {
            filter: { id },
            update: {
              $set: {
                product_id,
                filter_id,
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
        opMeta.push({ id, product_id, filter_id, excel_row: rowNumber });
      } catch (error) {
        // Validation failures also go to skipped DB
        results.skipped++;
        skippedDocs.push({
          id: cell(row, "id") || `invalid_row_${rowNumber}`,
          product_id: cell(row, "product_id") || "",
          filter_id: cell(row, "filter_id") || "",
          excel_row: rowNumber,
          skip_reason: error.message || "validation_failed",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      const batchMeta = opMeta.slice(i, i + BATCH_SIZE);

      try {
        const bulkResult = await SathyaProductFilter.collection.bulkWrite(batch, {
          ordered: false,
        });

        results.created += bulkResult.upsertedCount || 0;
        results.updated += bulkResult.modifiedCount || 0;
      } catch (error) {
        const writeErrors = error?.writeErrors || [];

        results.created += error?.result?.nUpserted || 0;
        results.updated += error?.result?.nModified || 0;

        const failedIndexes = new Set();

        for (const writeError of writeErrors) {
          const idx = writeError.index;
          failedIndexes.add(idx);

          const meta = batchMeta[idx];
          if (meta) {
            results.skipped++;
            skippedDocs.push({
              id: meta.id,
              product_id: meta.product_id,
              filter_id: meta.filter_id,
              excel_row: meta.excel_row,
              skip_reason: writeError.errmsg || writeError.message || "bulk_write_failed",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          if (results.errors.length < 50) {
            results.errors.push({
              row: meta?.excel_row || "batch",
              error: writeError.errmsg || writeError.message || "Bulk write failed",
            });
          }
        }

        // If Mongo reported a failure without writeErrors detail, mark whole leftover as skipped
        if (!writeErrors.length) {
          const ok =
            (error?.result?.nUpserted || 0) +
            (error?.result?.nModified || 0) +
            (error?.result?.nMatched || 0);
          const leftover = Math.max(batch.length - ok, 0);
          if (leftover > 0) {
            for (let j = 0; j < batchMeta.length; j++) {
              if (failedIndexes.has(j)) continue;
              // only push a portion if we can't know which failed — skip pushing all to avoid duplicates
            }
            if (results.errors.length < 50) {
              results.errors.push({
                row: "batch",
                error: error.message || "Bulk write failed",
              });
            }
            results.failed += leftover;
          }
        }
      }
    }

    await saveSkippedBatches(skippedDocs, results);

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    return NextResponse.json({
      message: `Product Filters: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped (saved: ${results.skipped_saved}), ${results.failed} failed (${seconds}s)`,
      details: { ...results, duration_seconds: Number(seconds) },
    });
  } catch (error) {
    console.error("Product filters bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to process product filters bulk upload", details: error.message },
      { status: 500 }
    );
  }
}
