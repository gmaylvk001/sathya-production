import { NextResponse } from "next/server";
import { updateShipmentStatus } from "@/lib/invenzoShipmentStatus";
import { saveInvensoResponseResult } from "@/lib/invensoResponseLog";
import dbConnect from "@/lib/db";
import ShipmentsInvenzo from "@/models/shipments_invenzo";

export const dynamic = "force-dynamic";

/**
 * Exist: POST /api/update-shipment-status → InvensoApiController@updateShipmentStatus
 * Requires Accept: application/json
 */
export async function POST(req) {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  if (!accept.includes("application/json")) {
    return NextResponse.json(
      {
        status: false,
        message: "Invalid request. Accept header must be application/json",
      },
      { status: 400 }
    );
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = await updateShipmentStatus(body);

  // Log full webhook request + our response JSON
  try {
    await dbConnect();
    const orderNumber =
      body?.order_number != null ? String(body.order_number).trim() : null;
    let userId = null;
    if (orderNumber) {
      const ship = await ShipmentsInvenzo.findOne({ order_number: orderNumber })
        .select("user_id")
        .lean();
      userId = ship?.user_id != null ? String(ship.user_id) : null;
    }
    await saveInvensoResponseResult({
      user_id: userId,
      order_number: orderNumber,
      call_type: "webhook_update",
      response: {
        request: body,
        response: result.body,
        httpStatus: result.httpStatus || 200,
      },
    });
  } catch (err) {
    console.error("invenso webhook log error:", err?.message || err);
  }

  return NextResponse.json(result.body, { status: result.httpStatus || 200 });
}
