import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import Warranty from "@/models/Warranty";

export async function POST(request) {
  await dbConnect();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

const warranties = rows
  .map((row) => ({
    item_no: (row["Item No."] || "").toString().trim(),
    name: row["Item Description"] || "",
    brand: row["Brand"] || "",
    year: Number(row["YEAR"]) || 0,
    price: Number(row["SPL PRICE"]) || 0,
    status: row["Status"] || "Active",
  }))
  .filter((w) => w.item_no);
  

  if (warranties.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found. Check if 'Item No.' column exists." },
      { status: 400 }
    );
  }

  
  const ops = warranties.map((w) => ({
    updateOne: {
      filter: { item_no: w.item_no },
      update: { $set: w },
      upsert: true,
    },
  }));

  const result = await Warranty.bulkWrite(ops);

  return NextResponse.json({
    success: true,
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    total: warranties.length,
  });
}