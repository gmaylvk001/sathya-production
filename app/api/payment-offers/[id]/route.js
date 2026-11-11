import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentOffer from "@/models/PaymentOffer";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment-offers/[id]
 * Fetch single payment offer
 */
async function resolveId(params) {
  const p = params && typeof params.then === "function" ? await params : params;
  return p?.id;
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const id = await resolveId(params);

    const offer = await PaymentOffer.findById(id).populate("bank").lean();
    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Payment offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: offer });
  } catch (error) {
    console.error("Error fetching single payment offer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/payment-offers/[id]
 * Update single payment offer
 */
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const id = await resolveId(params);
    const body = await request.json();

    const {
      bank,
      title,
      name,
      description,
      offerType,
      discountType = "PERCENTAGE",
      discountValue = 0,
      maxDiscountLimit = 0,
      minOrderValue = 0,
      cardType = "ALL",
      emiDetails = {},
      validFrom = null,
      validTill = null,
      isActive = true,
      priority = 0,
    } = body;

    const updatePayload = {
      title: title || name || "",
      name: name || title || "",
      description: description || "",
      offerType,
      discountType: (discountType || "PERCENTAGE").toUpperCase(),
      discountValue: Number(discountValue) || 0,
      maxDiscountLimit: Number(maxDiscountLimit) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      cardType: cardType || "ALL",
      emiDetails: {
        tenureMonths: Number(emiDetails?.tenureMonths) || 0,
        annualInterestRate: Number(emiDetails?.annualInterestRate) || 0,
        isNoCost: Boolean(emiDetails?.isNoCost),
      },
      validFrom: validFrom ? new Date(validFrom) : null,
      validTill: validTill ? new Date(validTill) : null,
      isActive: Boolean(isActive),
      priority: Number(priority) || 0,
    };

    if (bank) {
      updatePayload.bank = bank;
      updatePayload.bankId = bank;
    }

    const updated = await PaymentOffer.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate("bank")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Payment offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment offer updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating payment offer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payment-offers/[id]
 * Delete single payment offer
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const id = await resolveId(params);

    const deleted = await PaymentOffer.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Payment offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment offer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment offer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
