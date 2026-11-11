import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminRequest";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export async function POST(req) {
  const auth = await requireAdmin(req, "products");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const imageFiles = formData.getAll("image");
    const savedImages = [];

    if (!imageFiles.length) {
      return NextResponse.json({ error: "No images received" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/products");
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    for (const file of imageFiles) {
      if (!file || typeof file.name !== "string") continue;

      const ext = path.extname(file.name).toLowerCase();
      const mime = String(file.type || "").toLowerCase();
      if (!ALLOWED_EXT.has(ext) || (mime && !ALLOWED_MIME.has(mime))) {
        return NextResponse.json(
          { error: `File type not allowed: ${file.name}` },
          { status: 400 }
        );
      }

      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      savedImages.push(`/uploads/products/${filename}`);
    }

    return NextResponse.json({ savedImages }, { status: 200 });
  } catch (error) {
    console.error("product upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
