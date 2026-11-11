import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentOffer from "@/models/PaymentOffer";

export const dynamic = "force-dynamic";

/**
 * Bulk Status Toggle: PATCH /api/payment-offers/bulk
 * Body: { ids: string[], isActive: boolean }
 */
export async function PATCH(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { ids, isActive } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Array of offer IDs is required" },
        { status: 400 }
      );
    }

    const result = await PaymentOffer.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: Boolean(isActive) } }
    );

    return NextResponse.json({
      success: true,
      message: `Updated status for ${result.modifiedCount} offers`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk status update error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Bulk Delete: DELETE /api/payment-offers/bulk
 * Body: { ids: string[] }
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Array of offer IDs is required" },
        { status: 400 }
      );
    }

    const result = await PaymentOffer.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} payment offers`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
