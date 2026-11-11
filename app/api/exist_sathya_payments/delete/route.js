import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PaymentsNew from "@/models/payments_new";

const IMPORTED = { exist_id: { $type: "string" } };

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await PaymentsNew.deleteMany(IMPORTED);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} payments deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.paymentIds)
      ? body.paymentIds
      : body.paymentId
        ? [body.paymentId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const result = await PaymentsNew.deleteMany({
      _id: { $in: validIds },
      ...IMPORTED,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Payment deleted successfully"
        : `${result.deletedCount} payments deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
