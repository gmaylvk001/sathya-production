import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Route handler to serve exported PDF files directly from public/php-excel-export/
 * Matches the live URL pattern: https://www.sathya.store/php-excel-export/7933.pdf
 */
export async function GET(req, { params }) {
  try {
    const { filename } = await params;

    // Security check: ensure filename contains only alphanumeric chars, dashes, underscores, and .pdf extension
    if (!filename || !/^[a-zA-Z0-9_\-]+\.pdf$/i.test(filename)) {
      return NextResponse.json(
        { error: "Invalid file name requested" },
        { status: 400 }
      );
    }

    const exportDir = path.join(process.cwd(), "public", "php-excel-export");
    const filePath = path.join(exportDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Exported PDF not found or expired" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error serving exported PDF:", error);
    return NextResponse.json(
      { error: "Internal Server Error while serving PDF" },
      { status: 500 }
    );
  }
}
