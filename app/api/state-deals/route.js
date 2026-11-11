import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StateDeal from "@/models/StateDeal";
import OfferTimer from "@/models/Offertimer";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    let filter = {};
    if (search) {
      const searchNum = Number(search);
      const orConditions = [
        { offerTimerTitle: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
      if (!Number.isNaN(searchNum)) {
        orConditions.push({ dealId: searchNum }, { offerTimerId: searchNum });
      }
      filter.$or = orConditions;
    }

    const deals = await StateDeal.find(filter).sort({ dealId: 1 }).lean();
    return NextResponse.json({ success: true, data: deals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching state deals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch state deals" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { offerTimerId, offerTimerTitle, offerTimerRef, state, status } = body;

    if (offerTimerId === undefined || offerTimerId === null || !offerTimerTitle || !state) {
      return NextResponse.json(
        { success: false, error: "Offer Timer, Offer Timer ID, and State are required." },
        { status: 400 }
      );
    }

    const numericTimerId = Number(offerTimerId);
    if (Number.isNaN(numericTimerId)) {
      return NextResponse.json(
        { success: false, error: "Offer Timer ID must be a valid number." },
        { status: 400 }
      );
    }

    const normalizedState = String(state).trim().toLowerCase();
    if (!normalizedState) {
      return NextResponse.json(
        { success: false, error: "State cannot be empty." },
        { status: 400 }
      );
    }

    // Check for duplicate mapping
    const existing = await StateDeal.findOne({
      offerTimerId: numericTimerId,
      state: normalizedState,
    }).lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A deal for Offer Timer ID ${numericTimerId} and State "${normalizedState}" already exists. Duplicate mappings are not allowed.`,
        },
        { status: 400 }
      );
    }

    // Auto-increment dealId: find the highest dealId
    const lastDeal = await StateDeal.findOne().sort({ dealId: -1 }).select("dealId").lean();
    const nextDealId = lastDeal && typeof lastDeal.dealId === "number" ? lastDeal.dealId + 1 : 1;

    // Resolve offerTimerRef if not provided
    let resolvedTimerRef = offerTimerRef;
    if (!resolvedTimerRef) {
      const timerDoc = await OfferTimer.findOne({ timerId: numericTimerId }).select("_id").lean();
      if (timerDoc) {
        resolvedTimerRef = timerDoc._id;
      }
    }

    const newDeal = await StateDeal.create({
      dealId: nextDealId,
      offerTimerId: numericTimerId,
      offerTimerTitle: String(offerTimerTitle).trim(),
      offerTimerRef: resolvedTimerRef || null,
      state: normalizedState,
      status: status || "active",
    });

    return NextResponse.json(
      { success: true, data: newDeal, message: "State deal created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating state deal:", error);
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
      { success: false, error: error.message || "Failed to create state deal" },
      { status: 500 }
    );
  }
}
