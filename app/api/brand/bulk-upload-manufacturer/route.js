import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "brands");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

let updated = 0;
let skipped = 0;
const notFound = [];
const errors = [];

for (const [idx, row] of rows.entries()) {
  const brand_name = (row["Brand"] || "").toString().trim();
  const manufacturer_name = (row["Manufacturer Details"] || "").toString().trim();
  const manufacturer_address = (row[" Address"] || row["Address"] || "").toString().trim();

  if (!brand_name) {
    skipped++;
    errors.push({ row: idx + 2, error: "Missing Brand name" });
    continue;
  }

  try {
      
      const generated_slug = brand_name.toLowerCase().trim().replace(/\s+/g, "-");

      const existingBrand = await Brand.findOne({
        brand_slug: generated_slug,
      });

    if (existingBrand) {
      existingBrand.manufacturer_name = manufacturer_name;
      existingBrand.manufacturer_address = manufacturer_address;
      existingBrand.updatedAt = new Date();
      await existingBrand.save();
      updated++;
    } else {
      
      notFound.push(brand_name);
      skipped++;
    }
  } catch (err) {
    skipped++;
    errors.push({ row: idx + 2, error: err.message });
  }
}

return NextResponse.json({
  success: true,
  updated,
  skipped,
  notFound,
  errors,
});
  } catch (error) {
    console.error("Brand manufacturer bulk upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}