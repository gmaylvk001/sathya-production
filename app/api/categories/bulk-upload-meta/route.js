import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";

export const config = {
    api: {
        bodyParser: false,
    },
};

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export async function POST(req) {
    try {
        await dbConnect();

        const formData = await req.formData();
        const file = formData.get('excel') || formData.get('file');

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

        console.log("Total category meta bulk upload rows:", rows.length);

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
                const category_slug = (
                    row["category_slug"] ||
                    row["category slug"] ||
                    row["Category Slug"] ||
                    row["Category_Slug"] ||
                    row["slug"] ||
                    row["Slug"] ||
                    ""
                ).toString().trim();

                const category_name = (
                    row["category_name"] ||
                    row["category name"] ||
                    row["Category Name"] ||
                    row["Category_Name"] ||
                    row["category"] ||
                    row["Category"] ||
                    row["name"] ||
                    row["Name"] ||
                    ""
                ).toString().trim();

                const identifier = category_slug || category_name;

                if (!identifier) {
                    skippedCount++;
                    continue;
                }

                // If cell has a value -> update it; if cell is empty or not provided -> skip the cell (do not overwrite)
                const update = {};

                // 1. Meta Title (matches title / meta_title / meta title)
                const metaTitle = getCellString(row, [
                    "title",
                    "Title",
                    "meta_title",
                    "meta title",
                    "Meta Title",
                    "metaTitle",
                    "metatitle",
                ]);
                if (metaTitle !== null) {
                    update.meta_title = metaTitle;
                }

                // 2. Meta Description (matches description / meta_description / meta description)
                const metaDescription = getCellString(row, [
                    "description",
                    "Description",
                    "meta_description",
                    "meta description",
                    "Meta Description",
                    "metaDescription",
                    "metadescription",
                ]);
                if (metaDescription !== null) {
                    update.meta_description = metaDescription;
                }

                // 3. Meta Keywords (matches keywords / keyword / meta_keywords / meta_keyword)
                const metaKeyword = getCellString(row, [
                    "keywords",
                    "Keywords",
                    "keyword",
                    "Keyword",
                    "meta_keyword",
                    "meta keyword",
                    "Meta Keyword",
                    "metaKeyword",
                    "meta_keywords",
                    "meta keywords",
                    "Meta Keywords",
                    "metaKeywords",
                    "search_keywords",
                    "Search Keywords",
                ]);
                if (metaKeyword !== null) {
                    update.meta_keyword = metaKeyword;
                }

                // If none of the 3 fields had a value in this row, skip it
                if (Object.keys(update).length === 0) {
                    skippedCount++;
                    continue;
                }

                // Find Category:
                // 1) First by category_slug if slug is provided (slug is 100% unique in DB)
                let category = null;
                if (category_slug) {
                    category = await Category.findOne({ category_slug }).select("_id category_name category_slug");
                }

                // 2) By category_name (exact match)
                if (!category && category_name) {
                    category = await Category.findOne({ category_name }).select("_id category_name category_slug");
                }

                // 3) By category_name (case-insensitive regex)
                if (!category && category_name) {
                    category = await Category.findOne({
                        category_name: { $regex: new RegExp(`^${escapeRegex(category_name)}$`, "i") }
                    }).select("_id category_name category_slug");
                }

                // 4) Fallback: if category_name was actually entered as a slug (e.g. "smart-tvs")
                if (!category && category_name) {
                    category = await Category.findOne({ category_slug: category_name }).select("_id category_name category_slug");
                }

                if (!category) {
                    skippedCount++;
                    errors.push({
                        row: index + 2,
                        category: identifier,
                        error: `Category '${identifier}' not found by slug or name`,
                    });
                    continue;
                }

                update.updatedAt = new Date();

                await Category.updateOne(
                    { _id: category._id },
                    { $set: update }
                );

                updatedCount++;
            } catch (err) {
                errors.push({
                    row: index + 2,
                    error: err.message,
                });
            }
        }

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
        console.error('Category meta bulk upload error:', error);
        return NextResponse.json(
            { error: 'Category meta bulk upload error: ' + (error.message || error) },
            { status: 500 }
        );
    }
}
