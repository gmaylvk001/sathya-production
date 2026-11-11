import { NextResponse } from 'next/server';
import { join } from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import formidable from 'formidable';
import md5 from "md5";
import mongoose from 'mongoose';
import FilterGroup from '@/models/ecom_filter_group_infos';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";
import GroupInfo from '@/models/ecom_group_name_info';

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
        const workbook = XLSX.read(buffer);

        let rows = [];
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            rows = rows.concat(sheetRows);
        });
        if (fileName.endsWith('.csv')) {
            const csvText = buffer.toString('utf-8');
            const workbook = XLSX.read(csvText, { type: 'string' });
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
            const workbook = XLSX.read(buffer);
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        }

        const errors = [];
        let addedCount = 0;
        let existCount = 0;
        console.log("Total rows to process:", rows.length);
        for (let [index, row] of rows.entries()) {
            try {
                const item_code = row["item_code"]?.toString().trim();
                const keyFeatures = row["key features"]?.toString().trim();

                // ✅ Skip if SAP FEATURES not available
                if (!keyFeatures) {
                    continue;
                }

                // ✅ Skip if item_code not available
                if (!item_code) {
                    continue;
                }
                console.log("Processing item_code:", item_code);
                // Find product
                const product = await Product.findOne({ item_code });

                // ✅ Skip if product not found
                if (!product) {
                    continue;
                }

                // Convert SAP FEATURES → array
                const keySpecs = keyFeatures
                    .replace(/"/g, "")
                    .split(/[\n\r,]+/) // handles comma + newline
                    .map(item => item.trim())
                    .filter(Boolean);

                // ✅ Skip if no valid features after parsing
                if (!keySpecs.length) {
                    continue;
                }

                // Update product
                await Product.updateOne(
                    { _id: product._id },
                    { $set: { key_specifications: keySpecs } }
                );

                addedCount++;

            } catch (err) {
                errors.push({
                    row: index + 2,
                    error: err.message,
                });
            }
        }

        return NextResponse.json(
            {
                message: `Upload completed: ${addedCount} added, ${existCount} Product Key Features Already Exsit.`,
                details: errors,
            },
            { status: errors.length ? 207 : 200 }
        );

    } catch (error) {
        console.error('Bulk update error:', error);
        return NextResponse.json(
            { error: 'Bulk update error: ' + error.message },
            { status: 500 }
        )
    }
}

