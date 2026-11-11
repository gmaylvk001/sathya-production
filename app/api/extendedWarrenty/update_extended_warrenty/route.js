import { NextResponse } from 'next/server';
import { join } from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import mongoose from 'mongoose';

import ExtendedWarranty from "@/models/ecom_products_extended_warrent";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const excelFile = formData.get('excel');

    if (!excelFile) {
      return NextResponse.json({ error: 'Excel file is mandatory.' }, { status: 400 });
    }

    const allowedExtensions = [".xlsx", ".csv"];
    const fileName = excelFile.name.toLowerCase();
    if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
      return NextResponse.json({ error: "Only .xlsx and .csv allowed." }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await excelFile.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    await writeFile(join(uploadDir, `extended-warranty_${timestamp}.xlsx`), buffer);

    const validRows = rows.filter(r => r && r.length > 0 && r[0]);
    if (validRows.length <= 1) {
      return NextResponse.json({ error: "No data found." }, { status: 400 });
    }

    // ✅ MongoDB connect
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    let results = [];

    for (let i = 1; i < validRows.length; i++) {
      const row = validRows[i];

      const item_code = row[0];
      const year = Number(row[1]);
      const amount = Number(row[2]);
      const status = row[3] || "Active";

      if (!item_code || !year || !amount) continue;

      const now = new Date();

      let existing = await ExtendedWarranty.findOne({ item_code });

if (existing) {

  // ✅ FIX: ensure array exists
  if (!existing.extend_warranty) {
    existing.extend_warranty = [];
  }

  const alreadyYear = existing.extend_warranty.find(
    (w) => w.year === year
  );

  if (alreadyYear) {
    results.push({
      item_code,
      year,
      amount,
      message: "Year already exists",
      color: "red"
    });
    continue;
  }

  existing.extend_warranty.push({ year, amount });

  existing.modified_date = new Date();
  await existing.save();

  results.push({
    item_code,
    year,
    amount,
    message: "Added to existing item",
    color: "green"
  });

} else {

  const doc = new ExtendedWarranty({
    item_code,
    extend_warranty: [{ year, amount }],
    status,
    created_date: new Date(),
    modified_date: new Date()
  });

  await doc.save();

  results.push({
    item_code,
    year,
    amount,
    message: "New item created",
    color: "green"
  });
}
    }

    return NextResponse.json({
      message: "Extended warranties processed successfully",
      data: results
    });

  } catch (error) {
    console.error("ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}