import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip"; // ✅ NEW
import fs from "fs";
import path from "path";

import Product from "@/models/product";

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");
    const zipFile = formData.get("zip"); // ✅ NEW

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    /* ---------- READ EXCEL ---------- */
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    /* ---------- ZIP EXTRACT (NEW 🔥) ---------- */
    if (zipFile) {
      const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
      const zip = new AdmZip(zipBuffer);

      const uploadPath = path.join(process.cwd(), "public/uploads/products");

      // folder இல்லனா create பண்ணும்
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      zip.getEntries().forEach((entry) => {
        if (!entry.isDirectory) {
          const fileName = entry.entryName.split("/").pop().trim();

          const filePath = path.join(uploadPath, fileName);

          // file save
          fs.writeFileSync(filePath, entry.getData());
        }
      });

      console.log("✅ ZIP Extracted to /public/uploads/product");
    }

    let updated = 0;
    let skipped = 0;

    const normalize = (val) =>
      val ? val.toString().trim().replace(/\s+/g, " ") : "";

    /* ---------- LOOP ---------- */
    for (const row of rows) {
      try {
        const itemCode = normalize(
          row["Item No."] ||
          row["Item No"] ||
          row["ITEM NO."]
        );

        const productName = normalize(row["Product Name"]);

        const image1 = normalize(row["image1"]);
        const image2 = normalize(row["image2"]);
        const image3 = normalize(row["image3"]);

        const overviewImages = normalize(row["overview images"]);
        const overviewDescription = normalize(row["overview description"]);

        if (!itemCode) {
          skipped++;
          continue;
        }

        console.log("➡ Processing:", itemCode);

        /* ---------- IMAGES ARRAY ---------- */
        const imagesArray = [];

        // 👉 இங்க path மட்டும் change பண்ணலாம் (optional)
        if (image1) imagesArray.push(`${image1}`);
        if (image2) imagesArray.push(`${image2}`);
        if (image3) imagesArray.push(`${image3}`);

        /* ---------- OVERVIEW IMAGES ARRAY ---------- */
        let overviewImagesArray = [];

        if (overviewImages) {
          overviewImagesArray = overviewImages
            .split(",")
            .map((x) => `${x.trim()}`)
            .filter(Boolean);
        }

        /* ---------- UPDATE DATA ---------- */
        const updateData = {};

        if (productName) updateData.name = productName;

        if (imagesArray.length > 0) {
          updateData.images = imagesArray;
        }

        if (overviewImagesArray.length > 0) {
          updateData.overview_image = overviewImagesArray; // ✅ FIXED HERE
        }

        if (overviewDescription) {
          updateData.overviewdescription = overviewDescription;
        }

        if (overviewDescription) {
          updateData.overviewdescription = overviewDescription;
        }

        /* ---------- UPDATE ---------- */
        const result = await Product.updateOne(
          { item_code: itemCode },
          { $set: updateData }
        );

        if (result.matchedCount > 0) {
          updated++;
        } else {
          console.log("❌ Product not found:", itemCode);
          skipped++;
        }
      } catch (err) {
        console.log("❌ Row error:", err.message);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      updated,
      skipped,
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}