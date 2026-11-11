import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/product";
import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 400 });
    }

    const results = { success: [], notFound: [] };

    for (const row of rows) {
      const productCode = String(row["product_item_code"] || "").trim();
      const warrantyCodes = String(row["warranty_item_codes"] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!productCode) continue;

      const product = await Product.findOneAndUpdate(
        { item_code: productCode },
        { $set: { warranty_ids: warrantyCodes } },
        { new: true }
      );

      if (!product) {
        results.notFound.push(productCode);
      } else {
        results.success.push({ item_code: productCode, warranty_ids: warrantyCodes });
      }
    }

    return NextResponse.json({
      message: `Processed ${rows.length} rows`,
      updated: results.success.length,
      notFound: results.notFound,
      success: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}