import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/db";
import InvensoOrderTrack from "@/models/invenso_order_track";
import InvensoResponseResult from "@/models/invenso_response_result";

export const dynamic = "force-dynamic";

const SAVE_DIR = path.join(process.cwd(), "storage", "invenso_order_track");
const WEBHOOK_PASSWORD = "invenzo_order_track_sathya";

function readOrderNumber(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw =
    body.order_number ??
    body.orderNumber ??
    body.order_id ??
    body.shipment_no ??
    body.shipment_id ??
    null;
  const value = raw == null ? "" : String(raw).trim();
  return value || null;
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

/**
 * POST /api/webhook/invenzo-order-track-details
 * Saves the JSON body as a file and as a Mongo document.
 */
export async function POST(req) {
  const webhookPassword = String(req.headers.get("webhook_password") || "").trim();
  if (webhookPassword !== WEBHOOK_PASSWORD) {
    return NextResponse.json(
      { success: false, message: "Unauthorized webhook." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  if (body == null || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "JSON object or array is required." },
      { status: 400 }
    );
  }

  const orderNumber = readOrderNumber(body);
  if (!orderNumber) {
    return NextResponse.json(
      { success: false, message: "order_number is required." },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    const jobCreated = await InvensoResponseResult.findOne({
      order_number: orderNumber,
      call_type: "job_create",
      "response.status": { $regex: /^success$/i },
    })
      .select("_id")
      .lean();

    if (!jobCreated) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order is not allowed. This order_number has no job_create record with status success.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[invenzo-order-track-details] job check", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify order." },
      { status: 500 }
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const orderPart = safeFilePart(orderNumber);
  const fileName = `invenzo-order-track_${stamp}${orderPart ? `_${orderPart}` : ""}.json`;

  try {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    fs.writeFileSync(path.join(SAVE_DIR, fileName), JSON.stringify(body, null, 2), "utf8");

    await dbConnect();
    const saved = await InvensoOrderTrack.create({
      order_number: orderNumber,
      file_name: fileName,
      payload: body,
    });

    return NextResponse.json({
      success: true,
      message: "Order track details saved.",
      data: {
        id: String(saved._id),
        order_number: saved.order_number,
        file_name: saved.file_name,
      },
    });
  } catch (error) {
    console.error("[invenzo-order-track-details]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save order track details." },
      { status: 500 }
    );
  }
}
