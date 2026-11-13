import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
};

export async function GET(req, { params }) {
    const { path: parts } = await params;
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsRoot, ...parts);

    if (!filePath.startsWith(uploadsRoot)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new NextResponse("Not found", { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": MIME[ext] || "application/octet-stream",
            "Cache-Control": "public, max-age=3600",
        },
    });
}