import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";
import StateDeal from "@/models/StateDeal";
import { deleteCardOfferImages } from "@/lib/cardOffers/cardOfferFileService";
import { deleteOfferTimerBannerImages } from "@/lib/offerTimerFileService";

export const dynamic = "force-dynamic";

/**
 * Delete offer timer + related State Deals Offer Show rows + card offers,
 * and unlink image files from public/uploads (cardoffers + topbanner).
 * Requires confirm === "DELETE" (matches admin type-to-confirm popup).
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, confirm } = body || {};

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    if (String(confirm || "").trim() !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: 'Type DELETE to confirm. Confirmation text must be exactly "DELETE".',
        },
        { status: 400 }
      );
    }

    const timer = await OfferTimer.findById(id);
    if (!timer) {
      return NextResponse.json(
        { success: false, error: "Offer timer not found" },
        { status: 404 }
      );
    }

    const numericTimerId =
      typeof timer.timerId === "number"
        ? timer.timerId
        : typeof timer.custom_id === "number"
          ? timer.custom_id
          : Number(timer.timerId || timer.custom_id);

    // 1) Collect card-offer images + ids before removing the timer
    const cardOffers = Array.isArray(timer.card_offers) ? timer.card_offers : [];
    const cardImagePaths = cardOffers
      .map((item) => item?.image)
      .filter((img) => img && typeof img === "string" && img.trim() !== "");
    const deletingOfferIds = cardOffers
      .map((item) => item?.id ?? item?.Id)
      .filter((oid) => oid !== undefined && oid !== null);

    // 2) Delete States Deals Offer Show rows for this timer
    const stateDealFilter = {
      $or: [{ offerTimerRef: timer._id }],
    };
    if (!Number.isNaN(numericTimerId)) {
      stateDealFilter.$or.push({ offerTimerId: numericTimerId });
    }
    const stateDealResult = await StateDeal.deleteMany(stateDealFilter);
    const deletedStateDeals = stateDealResult?.deletedCount || 0;

    // 3) Unlink card-offer images under public/uploads/cardoffers
    const deletedCardFiles = await deleteCardOfferImages(cardImagePaths, {
      targetTimerId: timer._id || timer.timerId || id,
      deletingOfferIds,
    });

    // 4) Unlink top banner / deals popup under public/uploads/topbanner
    const deletedBannerFiles = await deleteOfferTimerBannerImages(timer);

    // 5) Delete the offer timer (card_offers embedded go with it)
    await OfferTimer.findByIdAndDelete(timer._id);

    return NextResponse.json(
      {
        success: true,
        message:
          "Offer timer, related state deals, and card offers deleted successfully",
        deletedStateDeals,
        deletedCardOffers: cardOffers.length,
        deletedCardFiles,
        deletedBannerFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting offer timer:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting offer timer" },
      { status: 500 }
    );
  }
}
