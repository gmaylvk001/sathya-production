import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/db";
import InvensoOrderTrack from "@/models/invenso_order_track";

export const dynamic = "force-dynamic";

const SAVE_DIR = path.join(process.cwd(), "storage", "invenso_order_track");
const WEBHOOK_API_KEY = "3a03ea12244b07217d4440987f2910f42a10e2d09b4961af7014a755f676c23e";

function readOrderNumber(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = [
    "externalOrderId",
    "external_order_id",
    "orderId",
    "order_number",
    "orderNumber",
    "order_id",
    "channelPartnerOrderId",
    "thirdPartyOrderId",
    "invoiceNumber",
    "shipment_no",
    "shipmentId",
    "shipment_id",
    "awbNumber",
    "jobId",
  ];
  for (const key of keys) {
    const raw = body[key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (value) return value;
  }
  return null;
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

/**
 * POST /izowhiz/update/orders/status
 * Saves the JSON body as a file and as a Mongo document.
 */
export async function POST(req) {
  const apiKey = String(req.headers.get("x-api-key") || "").trim();
  if (apiKey !== WEBHOOK_API_KEY) {
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
        externalOrderId: saved.order_number,
        jobId: body.jobId ?? null,
        currentStatus: body.currentStatus ?? body.status ?? null,
        file_name: saved.file_name,
      },
    });
  } catch (error) {
    console.error("[izowhiz/update/orders/status]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save order track details." },
      { status: 500 }
    );
  }
}
