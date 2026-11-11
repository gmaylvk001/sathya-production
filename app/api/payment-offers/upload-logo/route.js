import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import dbConnect from "@/lib/db";
import Bank from "@/models/Bank";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = [".svg", ".png", ".webp", ".jpg", ".jpeg"];

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") || formData.get("logo") || formData.get("image");
    const bankId = formData.get("bankId");
    const bankCode = formData.get("bankCode");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds 2MB limit" },
        { status: 400 }
      );
    }

    const originalName = file.name || "logo.png";
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format (${ext}). Allowed: SVG, PNG, WebP, JPG`,
        },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "banks");
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    const prefix = bankCode ? bankCode.toLowerCase().replace(/[^a-z0-9]/g, "") : "bank";
    const cleanName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const filename = `${prefix}_${Date.now()}_${cleanName}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/banks/${filename}`;

    // Optionally update Bank document if bankId is supplied
    if (bankId) {
      try {
        await dbConnect();
        await Bank.findByIdAndUpdate(bankId, {
          logoUrl: relativeUrl,
          logo: relativeUrl,
        });
      } catch (dbErr) {
        console.warn("Logo uploaded, but failed to link to bank document:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename,
      message: "Bank logo uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading bank logo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload logo" },
      { status: 500 }
    );
  }
}
