import dbConnect from "@/lib/db";
import ShipmentsInvenzo from "@/models/shipments_invenzo";
import ShipmentTrackingInvenzo from "@/models/shipment_tracking_invenzo";

function nowStr() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Exist InvensoApiController::trackingStatusUpdateOrCreate
 * in_transit is tracking-only; main shipment status stays shipped.
 */
export async function trackingStatusUpdateOrCreate(
  shipmentNo,
  loc = null,
  transit = null,
  trackingNumber = null
) {
  const shipment_no = String(shipmentNo || "").trim();
  let tracking = await ShipmentTrackingInvenzo.findOne({ shipment_id: shipment_no });

  const entryStatus = transit ? "in_transit" : "shipped";

  if (!tracking) {
    tracking = await ShipmentTrackingInvenzo.create({
      shipment_id: shipment_no,
      location: loc != null ? String(loc) : "",
      status: "shipped",
      message: "Order has",
      tracking_updates: [],
    });
  }

  const updates = Array.isArray(tracking.tracking_updates)
    ? [...tracking.tracking_updates]
    : [];
  updates.push({
    location: loc != null ? String(loc) : "",
    status: entryStatus,
    time: nowStr(),
  });

  tracking.location = loc != null ? String(loc) : tracking.location;
  if (entryStatus === "in_transit" || entryStatus === "shipped") {
    // Keep schema enum; in_transit allowed on tracking.status
    if (entryStatus === "in_transit") tracking.status = "in_transit";
    else if (tracking.status !== "in_transit") tracking.status = "shipped";
  }
  tracking.tracking_updates = updates;
  await tracking.save();

  return {
    status: true,
    code: "SHS1_TKS1",
    message: "Updated Shipped And Tracking Successfully",
    tracking_number: trackingNumber ?? null,
    data: tracking.toObject ? tracking.toObject() : tracking,
  };
}

/**
 * Exist InvensoApiController::delivered
 * Fixes Exist bugs: uses real location; creates tracking row if missing.
 */
export async function delivered(orderNumber, status, location, trackingNumber = null) {
  const shipment = await ShipmentsInvenzo.findOne({
    order_number: String(orderNumber).trim(),
  });
  if (!shipment) {
    return {
      status: false,
      code: "not found",
      message: "Shipment not found",
    };
  }

  shipment.status = status || "delivered";
  shipment.tracking_number = trackingNumber ?? shipment.tracking_number ?? null;
  shipment.delivered_at = new Date();
  await shipment.save();

  let tracking = await ShipmentTrackingInvenzo.findOne({
    shipment_id: shipment.shipment_no,
  });
  if (!tracking) {
    tracking = await ShipmentTrackingInvenzo.create({
      shipment_id: shipment.shipment_no,
      location: location != null ? String(location) : "",
      status: "shipped",
      message: "Order has",
      tracking_updates: [],
    });
  }

  const updates = Array.isArray(tracking.tracking_updates)
    ? [...tracking.tracking_updates]
    : [];
  updates.push({
    location: location != null ? String(location) : "",
    status: "delivered",
    time: nowStr(),
  });
  tracking.tracking_updates = updates;
  if (location != null) tracking.location = String(location);
  await tracking.save();

  return {
    status: true,
    code: "delivered",
    message: `Updated Order OrderNumber${shipment.order_number}Delivered`,
    tracking_number: trackingNumber ?? shipment.tracking_number ?? null,
  };
}

/**
 * Exist InvensoApiController@updateShipmentStatus
 */
export async function updateShipmentStatus(body = {}) {
  await dbConnect();

  const order_number = body.order_number != null ? String(body.order_number).trim() : "";
  const status = body.status != null ? String(body.status).trim().toLowerCase() : "";
  const location = body.location != null ? String(body.location).trim() : "";
  const tracking_number =
    body.tracking_number != null ? String(body.tracking_number).trim() : "";

  const allowed = ["shipped", "delivered", "cancelled", "pending", "in_transit"];
  if (!order_number || !status || !location || !tracking_number) {
    return {
      httpStatus: 422,
      body: {
        status: false,
        message: "order_number, status, location and tracking_number are required",
      },
    };
  }
  if (!allowed.includes(status)) {
    return {
      httpStatus: 422,
      body: {
        status: false,
        message: `status must be one of: ${allowed.join(", ")}`,
      },
    };
  }

  const shipmentFind = await ShipmentsInvenzo.findOne({ order_number });
  if (!shipmentFind) {
    return {
      httpStatus: 200,
      body: { status: false, code: "not found", message: "Shipment not found" },
    };
  }

  if (shipmentFind.status === "cancelled") {
    return {
      httpStatus: 200,
      body: {
        status: true,
        code: "Cancelled",
        message: `Already This Order OrderNumber${shipmentFind.order_number} Cancelled`,
      },
    };
  }

  if (shipmentFind.status === "delivered") {
    return {
      httpStatus: 200,
      body: {
        status: true,
        code: "delivered",
        message: `Already This Order OrderNumber${shipmentFind.order_number} Delivered`,
      },
    };
  }

  if (status === "cancelled") {
    shipmentFind.status = "cancelled";
    shipmentFind.cancelled_at = new Date();
    await shipmentFind.save();
    return {
      httpStatus: 200,
      body: {
        status: true,
        code: "Cancelled",
        message: `Updated Order OrderNumber${shipmentFind.order_number} Cancelled`,
      },
    };
  }

  if (status === "delivered") {
    // Exist bug used $request->locationr — use location correctly
    const result = await delivered(order_number, "delivered", location, tracking_number);
    return { httpStatus: 200, body: result };
  }

  if (status === "in_transit") {
    if (shipmentFind.status === "shipped") {
      const result = await trackingStatusUpdateOrCreate(
        shipmentFind.shipment_no,
        location,
        "in_transit",
        tracking_number
      );
      return { httpStatus: 200, body: result };
    }
    return {
      httpStatus: 200,
      body: {
        status: false,
        code: "Not_shipped",
        message: "Still Not Yet Shipped the Order",
      },
    };
  }

  if (status === "shipped" && location) {
    if (shipmentFind.status === "shipped") {
      const result = await trackingStatusUpdateOrCreate(
        shipmentFind.shipment_no,
        location,
        null,
        tracking_number
      );
      return { httpStatus: 200, body: result };
    }

    shipmentFind.status = "shipped";
    shipmentFind.tracking_number = tracking_number || null;
    shipmentFind.shipped_at = new Date();
    await shipmentFind.save();

    const result = await trackingStatusUpdateOrCreate(
      shipmentFind.shipment_no,
      location,
      null,
      tracking_number
    );
    return { httpStatus: 200, body: result };
  }

  // pending (and any other fall-through) — Exist: fails like location not found
  return {
    httpStatus: 200,
    body: {
      status: false,
      code: "location not found",
      message: "Please give location for shipped where",
    },
  };
}
