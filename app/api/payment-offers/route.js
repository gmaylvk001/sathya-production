import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentOffer from "@/models/PaymentOffer";
import Bank from "@/models/Bank";

export const dynamic = "force-dynamic";

/**
 * Admin API: Payment Offers CRUD
 * GET /api/payment-offers
 * POST /api/payment-offers
 * PATCH /api/payment-offers
 * DELETE /api/payment-offers
 */

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const offerType = searchParams.get("type"); // BANK_OFFER | EMI_OFFER
    const bankId = searchParams.get("bankId");

    const query = {};
    if (offerType) query.offerType = offerType;
    if (bankId) query.bank = bankId;

    const offers = await PaymentOffer.find(query)
      .populate({
        path: "bank",
        select: "name code shortCode logoUrl logo isActive",
      })
      .sort({ createdAt: -1 })
      .lean();

    const banks = await Bank.find({ isActive: true }).sort({ name: 1 }).lean();

    // Map fallbacks if bank logoUrl is missing or points to stale missing path
    const fallbackMap = {
      HDFC: "/images/banks/hdfc.svg",
      SBI: "/images/banks/sbi.svg",
      AXIS: "/images/banks/axis.svg",
      ICICI: "/images/banks/icici.svg",
      KOTAK: "/images/banks/kotak.svg",
      SCB: "/images/banks/scb.svg",
      RBL: "/images/banks/rbl.svg",
    };

    const resolveBankLogo = (b) => {
      if (!b) return "";
      const code = (b.code || b.shortCode || "").toUpperCase();
      if (!b.logoUrl || b.logoUrl === `/uploads/banks/${code.toLowerCase()}.png`) {
        return fallbackMap[code] || b.logoUrl || b.logo || "";
      }
      return b.logoUrl || b.logo || "";
    };

    const resolvedBanks = banks.map((b) => ({
      ...b,
      logoUrl: resolveBankLogo(b),
    }));

    const resolvedOffers = offers.map((o) => {
      if (o.bank) {
        return {
          ...o,
          bank: {
            ...o.bank,
            logoUrl: resolveBankLogo(o.bank),
          },
        };
      }
      return o;
    });

    return NextResponse.json({
      success: true,
      data: resolvedOffers,
      banks: resolvedBanks,
      count: resolvedOffers.length,
    });
  } catch (error) {
    console.error("Error fetching payment offers:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Offer ID is required" },
        { status: 400 }
      );
    }

    if (updates.emiDetails) {
      updates.emiDetails = {
        tenureMonths: Number(updates.emiDetails?.tenureMonths) || 0,
        annualInterestRate: Number(updates.emiDetails?.annualInterestRate) || 0,
        isNoCost: Boolean(updates.emiDetails?.isNoCost),
      };
    }
    if (updates.discountValue !== undefined) updates.discountValue = Number(updates.discountValue) || 0;
    if (updates.maxDiscountLimit !== undefined) updates.maxDiscountLimit = Number(updates.maxDiscountLimit) || 0;
    if (updates.minOrderValue !== undefined) updates.minOrderValue = Number(updates.minOrderValue) || 0;
    if (updates.priority !== undefined) updates.priority = Number(updates.priority) || 0;
    if (updates.bank) updates.bankId = updates.bank;

    const updated = await PaymentOffer.findByIdAndUpdate(
      id,
      { $set: updates },
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

export async function POST(request) {
  try {
    await dbConnect();
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
      applicableCategories = ["ALL"],
      cardType = "ALL",
      emiDetails = {},
      validFrom = null,
      validTill = null,
      isActive = true,
      priority = 0,
    } = body;

    if (!bank) {
      return NextResponse.json(
        { success: false, error: "Bank is required" },
        { status: 400 }
      );
    }

    if (!offerType || !["BANK_OFFER", "EMI_OFFER"].includes(offerType)) {
      return NextResponse.json(
        { success: false, error: "Valid offerType is required (BANK_OFFER or EMI_OFFER)" },
        { status: 400 }
      );
    }

    const newOffer = await PaymentOffer.create({
      bank,
      bankId: bank,
      title: title || name || "",
      name: name || title || "",
      description: description || "",
      offerType,
      discountType: (discountType || "PERCENTAGE").toUpperCase(),
      discountValue: Number(discountValue) || 0,
      maxDiscountLimit: Number(maxDiscountLimit) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      applicableCategories: Array.isArray(applicableCategories)
        ? applicableCategories
        : ["ALL"],
      cardType: cardType || "ALL",
      emiDetails: {
        tenureMonths: Number(emiDetails?.tenureMonths) || 0,
        annualInterestRate: Number(emiDetails?.annualInterestRate) || 0,
        isNoCost: Boolean(emiDetails?.isNoCost),
      },
      validFrom: validFrom ? new Date(validFrom) : null,
      validTill: validTill ? new Date(validTill) : null,
      isActive: isActive !== false,
      priority: Number(priority) || 0,
    });

    const populated = await PaymentOffer.findById(newOffer._id)
      .populate("bank")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Payment offer created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error creating payment offer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Offer ID is required" },
        { status: 400 }
      );
    }

    const updated = await PaymentOffer.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )
      .populate("bank")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer updated successfully",
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

export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Offer ID is required" },
        { status: 400 }
      );
    }

    const deleted = await PaymentOffer.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment offer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
