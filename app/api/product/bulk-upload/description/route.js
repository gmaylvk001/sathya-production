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

        const fileName = file.name.toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());

        let rows = [];
        if (fileName.endsWith('.csv')) {
            const csvText = buffer.toString('utf-8');
            const workbook = XLSX.read(csvText, { type: 'string' });
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        } else {
            // raw: true preserves newline characters inside cells (Alt+Enter in Excel)
            const workbook = XLSX.read(buffer, { raw: false });
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        }

        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        console.log("Total rows:", rows.length);

        for (let [index, row] of rows.entries()) {
            try {
                const item_code = row["item_code"]?.toString().trim();
                // Preserve newlines written as Alt+Enter inside the Excel cell (\n or \r\n)
                const description = row["description"]?.toString().trim();

                if (!item_code || !description) {
                    skippedCount++;
                    continue;
                }

                const product = await Product.findOne({ item_code });

                if (!product) {
                    skippedCount++;
                    continue;
                }

                // Normalize line endings so they are stored as \n
                const normalizedDescription = description
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n');

                // Convert to HTML
                const htmlDescription = `<p>${normalizedDescription
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean)
                    .join('<br>')}</p>`;
                await Product.updateOne(
                    { _id: product._id },
                    { $set: { description: htmlDescription } }
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
        console.error('Bulk description update error:', error);
        return NextResponse.json(
            { error: 'Bulk update error: ' + error.message },
            { status: 500 }
        );
    }
}
