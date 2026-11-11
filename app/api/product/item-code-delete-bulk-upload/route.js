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

    // ✅ 1. Get uploaded file
    const formData = await req.formData();
    const excelFile = formData.get("excel");

    if (!excelFile) {
      return NextResponse.json(
        { error: "Excel file is required" },
        { status: 400 }
      );
    }

    // ✅ 2. Validate file type
    const allowedExtensions = [".xlsx", ".csv"];
    const fileName = excelFile.name.toLowerCase();

    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: "Only .xlsx and .csv files are allowed" },
        { status: 400 }
      );
    }

    // ✅ 3. Save file (optional)
    const uploadDir = join(process.cwd(), "public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await excelFile.arrayBuffer());

    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    const filePath = join(uploadDir, `delete-products_${timestamp}.xlsx`);

    await fs.writeFile(filePath, buffer);

    // ✅ 4. Read Excel
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read as array (row-wise)
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // ✅ 5. Extract item_codes (Column A only)
    const itemCodes = data
      .slice(1) // skip header (Item No.)
      .map((row) => String(row[0] || "").trim())
      .filter((code) => code !== "");

    if (itemCodes.length === 0) {
      return NextResponse.json(
        { error: "No valid item codes found in Excel" },
        { status: 400 }
      );
    }

    // ✅ 6. Connect MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // ✅ 7. DELETE (bulk - fast)
    const result = await Product.deleteMany({
      item_code: { $in: itemCodes },
    });

    const deletedCount = result.deletedCount || 0;
    const notFoundCount = itemCodes.length - deletedCount;

    // ✅ 8. Response
    return NextResponse.json({
      message: "Products deleted successfully",
      totalExcelRows: itemCodes.length,
      deleted: deletedCount,
      notFound: notFoundCount,
    });

  } catch (error) {
    console.error("Delete Error:", error);

    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}