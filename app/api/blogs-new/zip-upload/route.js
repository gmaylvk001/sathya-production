import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const zipFile = formData.get("zip") || formData.get("file");

    if (!zipFile) {
      return NextResponse.json(
        { success: false, error: "No ZIP archive uploaded" },
        { status: 400 }
      );
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(zipBuffer);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "blogs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const entries = zip.getEntries();
    const savedFiles = [];
    const validImageExtensions = new Set([
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".svg",
      ".avif",
      ".bmp",
    ]);

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const rawName = entry.entryName.split("/").pop()?.trim() || "";
      // Ignore hidden files and MacOS metadata
      if (!rawName || rawName.startsWith(".") || entry.entryName.includes("__MACOSX")) {
        continue;
      }

      const ext = path.extname(rawName).toLowerCase();
      if (!validImageExtensions.has(ext)) {
        continue;
      }

      const sanitizedFilename = rawName.replace(/\s+/g, "_");
      const targetFilePath = path.join(uploadDir, sanitizedFilename);

      // Save file buffer
      fs.writeFileSync(targetFilePath, entry.getData());
      savedFiles.push(`/uploads/blogs/${sanitizedFilename}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${savedFiles.length} images to uploads/blogs`,
      count: savedFiles.length,
      savedFiles,
    });
  } catch (error) {
    console.error("ZIP extract error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to extract ZIP file" },
      { status: 500 }
    );
  }
}
