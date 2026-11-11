import { NextResponse } from "next/server";
import { join } from "path";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import { format } from "date-fns";
import mongoose from "mongoose";
import Product from "@/models/product";
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

    // ✅ Get form data
    const formData = await req.formData();
    const excelFile = formData.get("excel");

    if (!excelFile) {
      return NextResponse.json(
        { error: "Excel file is required" },
        { status: 400 }
      );
    }

    // ✅ Validate file type
    const allowedExtensions = [".xlsx", ".csv"];
    const fileName = excelFile.name.toLowerCase();

    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: "Only .xlsx and .csv allowed" },
        { status: 400 }
      );
    }

    // ✅ Save uploaded file (optional - for record)
    const uploadDir = join(process.cwd(), "public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await excelFile.arrayBuffer());

    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    const filePath = join(uploadDir, `stock-update_${timestamp}.xlsx`);

    await fs.writeFile(filePath, buffer);

    // ✅ Read Excel
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // ✅ Connect MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // ✅ Remove header row
    const rows = data.slice(1).filter((row) => row && row[0]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in Excel" },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let notFoundCount = 0;

    // ✅ Loop through Excel rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const item_code = String(row[0]).trim(); // Item No

      if (!item_code) continue;

      // ✅ Find product by item_code
      const product = await Product.findOne({ item_code });

      if (!product) {
        notFoundCount++;
        continue;
      }

      // ✅ Get quantity from DB ONLY
      const quantity = parseInt(product.quantity) || 0;

      // ✅ Decide stock based on quantity
      const stockStatus =
        quantity > 0 ? "In Stock" : "Out of Stock";

      // ✅ Update stock_status only
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            stock_status: stockStatus,
          },
        }
      );

      updatedCount++;
    }

    // ✅ Final response
    return NextResponse.json({
      message: "Stock status updated successfully",
      totalRows: rows.length,
      updated: updatedCount,
      notFound: notFoundCount,
    });
  } catch (error) {
    console.error("Upload Error:", error);

    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}