import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StateDeal from "@/models/StateDeal";
import OfferTimer from "@/models/Offertimer";

async function findDealById(idParam) {
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    return await StateDeal.findById(idParam);
  }
  const numericId = Number(idParam);
  if (!Number.isNaN(numericId)) {
    return await StateDeal.findOne({ dealId: numericId });
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const deal = await findDealById(id);

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "State deal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deal }, { status: 200 });
  } catch (error) {
    console.error("Error fetching state deal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch state deal" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const deal = await findDealById(id);

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "State deal not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { offerTimerId, offerTimerTitle, offerTimerRef, state, status } = body;

    const numericTimerId =
      offerTimerId !== undefined ? Number(offerTimerId) : deal.offerTimerId;
    const normalizedState =
      state !== undefined ? String(state).trim().toLowerCase() : deal.state;

    if (Number.isNaN(numericTimerId)) {
      return NextResponse.json(
        { success: false, error: "Offer Timer ID must be a valid number." },
        { status: 400 }
      );
    }

    if (!normalizedState) {
      return NextResponse.json(
        { success: false, error: "State cannot be empty." },
        { status: 400 }
      );
    }

    // Check duplicate mapping excluding current record
    const duplicate = await StateDeal.findOne({
      _id: { $ne: deal._id },
      offerTimerId: numericTimerId,
      state: normalizedState,
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `A deal for Offer Timer ID ${numericTimerId} and State "${normalizedState}" already exists. Duplicate mappings are not allowed.`,
        },
        { status: 400 }
      );
    }

    // Resolve offerTimerRef if needed
    let resolvedTimerRef = offerTimerRef !== undefined ? offerTimerRef : deal.offerTimerRef;
    if (offerTimerId !== undefined && offerTimerId !== deal.offerTimerId) {
      const timerDoc = await OfferTimer.findOne({ timerId: numericTimerId }).select("_id").lean();
      if (timerDoc) {
        resolvedTimerRef = timerDoc._id;
      }
    }

    deal.offerTimerId = numericTimerId;
    if (offerTimerTitle) deal.offerTimerTitle = String(offerTimerTitle).trim();
    deal.offerTimerRef = resolvedTimerRef || null;
    deal.state = normalizedState;
    if (status) deal.status = status;

    await deal.save();

    return NextResponse.json(
      { success: true, data: deal, message: "State deal updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating state deal:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "A state deal with this Offer Timer and State already exists.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update state deal" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const deal = await findDealById(id);

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "State deal not found" },
        { status: 404 }
      );
    }

    await StateDeal.findByIdAndDelete(deal._id);

    return NextResponse.json(
      { success: true, message: "State deal deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting state deal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete state deal" },
      { status: 500 }
    );
  }
}
