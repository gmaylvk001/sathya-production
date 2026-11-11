import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";
import { normalizeOfferValue } from "@/lib/exchangeOfferMatch";
import * as xlsx from "xlsx";

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Empty file" }, { status: 400 });
    }

    // Get max ID
    const maxRecord = await ExchangeOfferCondition.findOne().sort({ id: -1 });
    let nextId = maxRecord && maxRecord.id ? maxRecord.id + 1 : 1;

    const itemsToInsert = [];

    for (const row of data) {
      // Map Excel columns to model fields
      const categoryName = row["Category Name"] || row["Category"] || "";
      const brand = row["Brand"] || "";
      const type = row["Type"] || "";
      const condition = row["Condition"] || "";
      const zone = row["Zone"] || "";
      const price = parseFloat(row["Price"]) || 0;
      const status = row["Status"] || "Active";

      if (categoryName && brand) {
        itemsToInsert.push({
          id: nextId++,
          categoryName: normalizeOfferValue(categoryName),
          brand: normalizeOfferValue(brand),
          type: normalizeOfferValue(type),
          condition: normalizeOfferValue(condition),
          zone: normalizeOfferValue(zone),
          price,
          status: String(status).trim() === "Inactive" ? "Inactive" : "Active",
        });
      }
    }

    if (itemsToInsert.length > 0) {
      await ExchangeOfferCondition.insertMany(itemsToInsert);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${itemsToInsert.length} records imported successfully` 
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
