import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/adminRequest";

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    const ext = path.extname(file.name || "").toLowerCase() || ".webp";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { success: false, message: "Unsupported image format. Use PNG, JPG, WEBP or SVG." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Logo file must be smaller than 2MB" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `header-logo-${Date.now()}${ext}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    return NextResponse.json(
      { success: true, url: `/uploads/${filename}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading header logo:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload logo" },
      { status: 500 }
    );
  }
}
