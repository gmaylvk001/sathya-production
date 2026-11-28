import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistPaymentRefund from "@/models/exist_payment_refund";
import { splitExistRefundsByMove } from "@/lib/existPaymentRefundMoved";

const IMPORTED = { exist_id: { $type: "string" } };

async function deleteMovedStatus(moveStatus) {
  const rows = await ExistPaymentRefund.find(IMPORTED)
    .select("_id order_number refund_id payment_id")
    .lean();
  const { marked } = await splitExistRefundsByMove(rows);
  const ids = marked
    .filter((row) => (moveStatus === "moved" ? row.is_moved : !row.is_moved))
    .map((row) => row._id);

  let deletedCount = 0;
  const chunkSize = 2000;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const result = await ExistPaymentRefund.deleteMany({
      _id: { $in: ids.slice(i, i + chunkSize) },
      ...IMPORTED,
    });
    deletedCount += result.deletedCount || 0;
  }
  return deletedCount;
}

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await ExistPaymentRefund.deleteMany(IMPORTED);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} payment refunds deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const moveStatus = String(body.move_status || "").trim();
    if ((moveStatus === "moved" || moveStatus === "unmoved") && !body.refundId && !body.refundIds) {
      const deletedCount = await deleteMovedStatus(moveStatus);
      const label = moveStatus === "moved" ? "moved" : "unmoved";
      return NextResponse.json({
        success: true,
        message: `${deletedCount} ${label} payment refunds deleted successfully`,
        deletedCount,
        move_status: moveStatus,
      });
    }

    const ids = Array.isArray(body.refundIds)
      ? body.refundIds
      : body.refundId
        ? [body.refundId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Refund row ID is required" }, { status: 400 });
    }

    const result = await ExistPaymentRefund.deleteMany({
      _id: { $in: validIds },
      ...IMPORTED,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Payment refund not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Payment refund deleted successfully"
        : `${result.deletedCount} payment refunds deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist payment refund:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
