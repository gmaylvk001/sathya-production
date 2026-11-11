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
import md5 from "md5";
import mongoose from 'mongoose';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";
import { requireAdmin } from "@/lib/adminRequest";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "products");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const excelFile = formData.get('excel');

    if (!excelFile) {
      return NextResponse.json(
        { error: 'Missing required file: Excel file is mandatory.' },
        { status: 400 }
      );
    }

    const allowedExtensions = [".xlsx", ".csv"];
    const fileName = excelFile.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: "Invalid file type. Only .xlsx and .csv files are allowed." },
        { status: 400 }
      );
    }

    const uploadDir = join(process.cwd(), 'public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Read Excel
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer());
    const workbook = XLSX.read(excelBuffer);
    const products = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    await writeFile(join(uploadDir, `uploaded-products_${timestamp}.xlsx`), excelBuffer);

    // Connect MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const validProducts = products.slice(1).filter(row => row && row[0]); // skip header

    if (!validProducts || validProducts.length === 0) {
      return NextResponse.json(
        { error: "No valid products found in Excel." },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let insertedCount = 0;

    for (let i = 0; i < validProducts.length; i++) {
      const row = validProducts[i];

      const item_code = row[0];
      //const quantity = Number(row[1]) || 0;  // ✅ Column 2 = Quantity
      
      // ✅ Handle status conversion: 0 = Inactive, 1 = Active
      let status = "Inactive";
      if (String(row[1]).toLowerCase() == 'active') {
        status = "Active";
      }
      
      //const name = row[3] || "";             // Optional name if present

      const existingProduct = await Product.findOne({ item_code });

      if (existingProduct) {
        const currentQty = existingProduct.quantity || 0;
        // ✅ Update quantity + status always
        const updateData = {
          //quantity,
          status,
          // stock_status: quantity > 0 ? "In Stock" : "Out of Stock",
          stock_status: currentQty > 0 ? "In Stock" : "Out of Stock",
        };

        await Product.updateOne({ _id: existingProduct._id }, { $set: updateData });
        updatedCount++;
      } else {
        // ✅ Create new product if not exists
        /* const productSlug = (name || item_code).toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();

        await Product.create({
          item_code,
          name: name || `Product-${item_code}`,
          quantity,
          status,
          stock_status: quantity > 0 ? "In Stock" : "Out of Stock",
          slug: productSlug,
          md5_name: md5(productSlug),
        });

        insertedCount++; */
      }
    }

    return NextResponse.json({
      message: `Excel processed. Updated: ${updatedCount}, Inserted: ${insertedCount}, Total: ${validProducts.length}`,
      updated: updatedCount,
      inserted: insertedCount,
      total: validProducts.length,
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload: ' + error.message },
      { status: 500 }
    );
  }
}