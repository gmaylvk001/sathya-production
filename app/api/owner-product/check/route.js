import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { resolveOrderItemsFulfillment } from "@/lib/regionalFulfillment";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ success: true, allExist: true, isValid: true, items: [] });
    }

    const result = await resolveOrderItemsFulfillment({
      pincode: body?.pincode || "560001",
      state: body?.state || "Karnataka",
      region: body?.region || "karnataka",
      deliveryType: body?.deliveryType || "home",
      items,
    });

    const mapped = result.items.map((item) => ({
      name: item.name,
      productId: item.productId,
      item_code: item.item_code,
      exists: Boolean(item.isDeliverable),
      isDeliverable: Boolean(item.isDeliverable),
      assignedVendor: item.assignedVendor,
      availableStock: item.availableStock,
      ...(item.errorReason ? { errorReason: item.errorReason } : {}),
    }));

    return NextResponse.json({
      success: true,
      allExist: mapped.every((item) => item.exists),
      isValid: result.isValid,
      assignedVendor: result.assignedVendor,
      items: mapped,
    });
  } catch (error) {
    console.error("POST /api/owner-product/check error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to check Karnataka product availability" },
      { status: 500 }
    );
  }
}
