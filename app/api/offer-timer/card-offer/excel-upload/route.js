import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";
import { importCardOffers } from "@/lib/cardOffers/cardOfferImportService";
import { requireAdmin } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

const MAX_EXCEL_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024;  // 100 MB

// GET: Retrieve available Offer Timers for the upload modal selection dropdown
export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized access" },
        { status: auth.status || 401 }
      );
    }

    await dbConnect();
    const timers = await OfferTimer.find()
      .select("_id timerId custom_id offerTitle offer_title startDate endDate state")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = timers.map((t) => ({
      _id: String(t._id),
      timerId: t.timerId ?? t.custom_id ?? null,
      title: t.offerTitle || t.offer_title || `Timer #${t.timerId || t._id}`,
      state: t.state || "all",
    }));

    return NextResponse.json({ success: true, timers: formatted });
  } catch (error) {
    console.error("Error fetching offer timers for excel upload:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load offer timers" },
      { status: 500 }
    );
  }
}

// POST: Process uploaded Excel and Images ZIP
export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin privileges required." },
        { status: auth.status || 401 }
      );
    }

    let formData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid multipart form data in request." },
        { status: 400 }
      );
    }

    const timerId = formData.get("timerId");
    const excelFile = formData.get("excel");
    const zipFile = formData.get("zip");

    // 1. Validate required fields
    if (!timerId) {
      return NextResponse.json(
        { success: false, error: "Please select an Offer Timer." },
        { status: 400 }
      );
    }

    if (!excelFile || typeof excelFile === "string" || !excelFile.size) {
      return NextResponse.json(
        { success: false, error: "Excel / CSV file is required." },
        { status: 400 }
      );
    }

    if (!zipFile || typeof zipFile === "string" || !zipFile.size) {
      return NextResponse.json(
        { success: false, error: "Images ZIP file is required." },
        { status: 400 }
      );
    }

    // 2. Validate file extension and size (.xlsx / .xls / .csv)
    const excelName = (excelFile.name || "").toLowerCase();
    const excelAllowed =
      excelName.endsWith(".xlsx") ||
      excelName.endsWith(".xls") ||
      excelName.endsWith(".csv");
    if (!excelAllowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid spreadsheet format. Only .xlsx, .xls, and .csv files are allowed.",
        },
        { status: 400 }
      );
    }
    if (excelFile.size > MAX_EXCEL_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Spreadsheet file exceeds maximum allowed size (20MB).",
        },
        { status: 400 }
      );
    }

    const zipName = (zipFile.name || "").toLowerCase();
    if (!zipName.endsWith(".zip")) {
      return NextResponse.json(
        { success: false, error: "Invalid archive format. Only .zip files are allowed." },
        { status: 400 }
      );
    }
    if (zipFile.size > MAX_ZIP_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "ZIP file exceeds maximum allowed size (100MB)." },
        { status: 400 }
      );
    }

    // 3. Convert files to Buffers
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer());
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());

    // 4. Run import pipeline
    const result = await importCardOffers({
      excelBuffer,
      zipBuffer,
      timerId,
      excelFileName: excelFile.name || "",
      excelMimeType: excelFile.type || "",
    });

    const summaryParts = [];
    if (result.createdCount > 0) summaryParts.push(`${result.createdCount} created`);
    if (result.updatedCount > 0) summaryParts.push(`${result.updatedCount} updated`);
    if (result.failedCount > 0) summaryParts.push(`${result.failedCount} failed`);

    const summaryMessage =
      result.failedCount === 0
        ? `Successfully imported all ${result.importedCount} card offers (${summaryParts.join(", ")}).`
        : `Processed ${result.totalRows} rows: ${summaryParts.join(", ")}.`;

    return NextResponse.json({
      success: true,
      message: summaryMessage,
      ...result,
    });
  } catch (error) {
    console.error("Card Offers Excel Upload error:", error);
    // Sanitize error message to avoid leaking stack traces
    const safeMessage = error.message || "An unexpected error occurred while processing your upload.";
    return NextResponse.json(
      {
        success: false,
        error: safeMessage,
      },
      { status: error.status || 500 }
    );
  }
}
