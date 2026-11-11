import { NextResponse } from 'next/server';
import { join } from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import Product from "@/models/product";
import Category from  "@/models/ecom_category_info";
import formidable from 'formidable';
import md5 from "md5";
import mongoose from 'mongoose';
import { toast } from 'react-toastify';


export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req) {
    try {
        const formData  = await req.formData();
        const file      = formData.get("excel");

        if(!file) {
            return NextResponse.json(
                { error: 'Excel or CSV file is required.' },
                { status: 400 }
            );
        }

        const fileName  = file.name.toLowerCase();
        const buffer    = Buffer.from(await file.arrayBuffer());
        let rows        = [];

        if (fileName.endsWith('.csv')) {
            const csvText   = buffer.toString('utf-8');
            const workbook  = XLSX.read(csvText, { type: 'string' });
            rows            = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
            const workbook  = XLSX.read(buffer);
            rows            = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            // console.log(rows);
        }

        const errors        = [];
        let addedCount      = 0;
        let notFoundCount   = 0;

        for(let [index, row] of rows.entries()) {

            const item_code                 = row.item_code.toString().trim();
            const category                  = row.category.toString().trim();
            const sub_category_1            = row.sub_category_1?.toString().trim() || row.sub_category?.toString().trim();

            if(sub_category_1) {
                const sub_category_1_slug   = sub_category_1.trim().toLowerCase().replace(/[^\w\s.-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                let exist_category = await Category.findOne({
                    category_slug: sub_category_1_slug,
                });

                if(exist_category) {
                    await Product.updateOne(
                        { item_code: item_code },
                        { $set: { 
                                category: exist_category.parentid,
                                sub_category: exist_category._id.toString()
                            } 
                        }
                    );
                    addedCount++;
                }else {
                    notFoundCount++;
                    continue;
                }
            }else {
                errors.push({
                    row: index + 2,
                    error: "Missing sub_category_1 or sub_category",
                });
                continue;
            }

        }   

        return NextResponse.json(
            { message: `Total Added Category Products Count: ${addedCount} & Not Found or Not Added Product Count: ${notFoundCount} ` },
            { status: 200 }
        );

    }catch(error) {
        console.log("Category Bulk UPload Error: ", error);
        return NextResponse.json(
            { error: 'Category Bulk UPload Error: ' + error },
            { status: 500 }
        );
    }
}