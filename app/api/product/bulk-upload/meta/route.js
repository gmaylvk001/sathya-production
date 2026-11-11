import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from "@/lib/db";
import Product from "@/models/product";

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req) {
    try {
        await dbConnect();

        const formData = await req.formData();
        const file = formData.get('excel');

        if (!file) {
            return NextResponse.json(
                { error: 'Excel or CSV file is required.' },
                { status: 400 }
            );
        }

        const fileName = (file.name || "").toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());

        let rows = [];
        if (fileName.endsWith('.csv')) {
            const csvText = buffer.toString('utf-8');
            const workbook = XLSX.read(csvText, { type: 'string' });
            rows = XLSX.utils.sheet_to_json(
                workbook.Sheets[workbook.SheetNames[0]],
                { defval: "" }
            );
        } else {
            const workbook = XLSX.read(buffer, { raw: false });
            rows = XLSX.utils.sheet_to_json(
                workbook.Sheets[workbook.SheetNames[0]],
                { defval: "" }
            );
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json(
                { error: 'Uploaded file contains no data rows.' },
                { status: 400 }
            );
        }

        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        console.log("Total meta bulk upload rows:", rows.length);

        // Helper: retrieve cell value as non-empty string or null
        const getCellString = (row, candidates) => {
            for (const key of candidates) {
                if (row[key] !== undefined && row[key] !== null) {
                    const val = String(row[key]).trim();
                    if (val !== "") return val;
                }
            }
            return null;
        };

        for (let [index, row] of rows.entries()) {
            try {
                const item_code = (
                    row["item_code"] ||
                    row["Item Code"] ||
                    row["Item_Code"] ||
                    row["item code"] ||
                    row["ItemCode"] ||
                    row["product item_code"] ||
                    row["product_item_code"] ||
                    ""
                ).toString().trim();

                if (!item_code) {
                    skippedCount++;
                    continue;
                }

                // If cell has a value -> update it; if cell is empty or not provided -> skip the cell (do not overwrite)
                const update = {};

                // 1. Meta Title
                const metaTitle = getCellString(row, [
                    "meta_title",
                    "meta title",
                    "Meta Title",
                    "metaTitle",
                    "title",
                    "Title",
                    "metatitle",
                ]);
                if (metaTitle !== null) {
                    update.meta_title = metaTitle;
                }

                // 2. Meta Description
                const metaDescription = getCellString(row, [
                    "meta_description",
                    "meta description",
                    "Meta Description",
                    "metaDescription",
                    "description",
                    "Description",
                    "metadescription",
                ]);
                if (metaDescription !== null) {
                    update.meta_description = metaDescription;
                }

                // 3. Meta Keywords
                const metaKeywords = getCellString(row, [
                    "meta_keywords",
                    "meta keywords",
                    "Meta Keywords",
                    "metaKeywords",
                    "keywords",
                    "Keywords",
                    "search_keywords",
                    "Search Keywords",
                    "searchkeywords",
                    "metakeywords",
                ]);
                if (metaKeywords !== null) {
                    update.search_keywords = metaKeywords;
                }

                // If none of the 3 fields had a value in this row, skip it
                if (Object.keys(update).length === 0) {
                    skippedCount++;
                    continue;
                }

                const product = await Product.findOne({ item_code }).select("_id item_code");

                if (!product) {
                    skippedCount++;
                    errors.push({
                        row: index + 2,
                        item_code,
                        error: `Product with item_code '${item_code}' not found`,
                    });
                    continue;
                }

                await Product.updateOne(
                    { _id: product._id },
                    { $set: update }
                );

                updatedCount++;
                console.log("count:", updatedCount);
            } catch (err) {
                errors.push({
                    row: index + 2,
                    error: err.message,
                });
            }
        }

        console.log("Total updated count:", updatedCount);

        return NextResponse.json(
            {
                message: `Completed: ${updatedCount} updated, ${skippedCount} skipped`,
                updatedCount,
                skippedCount,
                errors,
            },
            { status: errors.length > 0 && updatedCount === 0 ? 400 : 200 }
        );

    } catch (error) {
        console.error('Meta bulk upload error:', error);
        return NextResponse.json(
            { error: 'Meta bulk upload error: ' + (error.message || error) },
            { status: 500 }
        );
    }
}
