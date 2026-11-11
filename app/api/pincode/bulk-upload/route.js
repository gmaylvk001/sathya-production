import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import PincodeServiceability from "@/models/PincodeServiceability";

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let inserted = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      const sapCode = (row["SAP Code"] || "").toString().trim();
      const branchName = (row["Branch Name"] || "").toString().trim();
      const branchPincode = (row["Branch Pincode"] || "").toString().trim();
      const serviceablePincode = (row["Serviceable\nPincode"] || row["Serviceable Pincode"] || row["ServiceablePincode"] || "").toString().trim();
      const distanceKm = parseFloat(row["Distance\n(km)"] || row["Distance (km)"] || row["DistanceKm"] || 0);
      const branchAddress = (row["Branch Address"] || "").toString().trim();

      if (!sapCode || !serviceablePincode) { skipped++; continue; }

      const result = await PincodeServiceability.findOneAndUpdate(
        { sapCode, serviceablePincode },
        { branchName, branchPincode, serviceablePincode, distanceKm, branchAddress },
        { upsert: true, new: true }
      );

      result._id ? updated++ : inserted++;
    }

    return NextResponse.json({ success: true, inserted, updated, skipped });
  } catch (err) {
    console.error("Pincode bulk upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}