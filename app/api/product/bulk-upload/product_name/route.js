import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Product from "@/models/product";

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('excel');

        if (!file) {
            return NextResponse.json(
                { error: 'Excel or CSV file is required.' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Read file
        const workbook = XLSX.read(buffer);
        let rows = XLSX.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
            { defval: "" }
        );

        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        console.log("Total rows:", rows.length);

        for (let [index, row] of rows.entries()) {
            try {
                const item_code = (row["item_code"] || row["Item Code"] || "").toString().trim();
                const product_name = (
                    row["name"] ||
                    row["product_name"] ||
                    ""
                ).toString().trim();
                const title = (row["title"] || row["meta_title"] || "").toString().trim();
                const description = (row["description"] || "").toString().trim();
                const keywords = (
                    row["keywords"] ||
                    row["search_keywords"] ||
                    ""
                ).toString().trim();

                if (!item_code || (!product_name && !title && !description && !keywords)) {
                    skippedCount++;
                    continue;
                }

                const product = await Product.findOne({ item_code });

                if (!product) {
                    skippedCount++;
                    continue;
                }

                const update = {};
                if (product_name) update.name = product_name;
                if (title) update.meta_title = title;
                if (description) update.description = description;
                if (keywords) update.search_keywords = keywords;

                await Product.updateOne(
                    { _id: product._id },
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
                errors,
            },
            { status: errors.length ? 207 : 200 }
        );

    } catch (error) {
        console.error('Bulk update error:', error);
        return NextResponse.json(
            { error: 'Bulk update error: ' + error.message },
            { status: 500 }
        );
    }
}