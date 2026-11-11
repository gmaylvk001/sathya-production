import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Offertimer from "@/models/Offertimer";
import StateDeal from "@/models/StateDeal";
import { normalizeRegion } from "@/lib/regionHelper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const rawState =
      searchParams.get("state") ||
      searchParams.get("region") ||
      req.cookies?.get("sathya_location")?.value;

    let region = "tamilnadu";
    if (rawState) {
      try {
        if (rawState.startsWith("{")) {
          const parsed = JSON.parse(rawState);
          region = normalizeRegion(parsed.region || parsed.state || parsed.stateName);
        } else {
          region = normalizeRegion(rawState);
        }
      } catch {
        region = normalizeRegion(rawState);
      }
    }

    const now = new Date();
    const regionRegex = new RegExp(`^${region}$`, "i");
    const stateNameMap = {
      tamilnadu: "Tamil Nadu",
      kerala: "Kerala",
      andhra: "Andhra Pradesh",
      karnataka: "Karnataka",
      telangana: "Telangana",
    };
    const friendlyName = stateNameMap[region] || "";
    const nameRegex = friendlyName ? new RegExp(`^${friendlyName}$`, "i") : null;

    const stateMatchOr = [
      { offerViewStates: "all" },
      { offerViewStates: region },
      { offerViewStates: regionRegex },
      { states: "all" },
      { states: region },
      { states: regionRegex },
      { state: "all" },
      { state: region },
      { state: regionRegex },
    ];
    if (nameRegex) {
      stateMatchOr.push(
        { offerViewStates: nameRegex },
        { states: nameRegex },
        { state: nameRegex }
      );
    }

    let activeTimer = null;
    let isUpcoming = false;

    // =========================================================================
    // 1st PRIORITY: "States Deals Offer Show" mapped timer for this state
    // (Latest added or edited state deal has first priority: updatedAt: -1, createdAt: -1)
    // =========================================================================
    try {
      const stateAliases = {
        tamilnadu: ["tamilnadu", "tamil nadu", "tn"],
        andhra: ["andhra", "andhra pradesh", "ap"],
        kerala: ["kerala", "kl"],
        karnataka: ["karnataka", "ka"],
        telangana: ["telangana", "ts", "tg"],
      };
      const aliases = stateAliases[region.toLowerCase()] || [region.toLowerCase()];
      if (friendlyName) aliases.push(friendlyName.toLowerCase());

      const stateDeal = await StateDeal.findOne({
        state: { $in: aliases },
        status: { $ne: "inactive" },
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

      if (stateDeal) {
        let mappedTimer = null;
        if (stateDeal.offerTimerRef) {
          mappedTimer = await Offertimer.findById(stateDeal.offerTimerRef).lean();
        }
        if (!mappedTimer && stateDeal.offerTimerId) {
          mappedTimer = await Offertimer.findOne({ timerId: Number(stateDeal.offerTimerId) }).lean();
        }

        if (mappedTimer) {
          const isDisplay =
            (mappedTimer.timerDisplayStatus ? mappedTimer.timerDisplayStatus === "Yes" : true) &&
            (mappedTimer.status ? mappedTimer.status === "active" : true);

          const end = mappedTimer.endDate || mappedTimer.offer_end;
          const isNotExpired = !end || new Date(end).getTime() > now.getTime();

          if (isDisplay && isNotExpired) {
            activeTimer = mappedTimer;
            const start = mappedTimer.startDate || mappedTimer.offer_start;
            if (start && new Date(start).getTime() > now.getTime()) {
              isUpcoming = true;
            }
          }
        }
      }
    } catch (dealErr) {
      console.error("Error checking StateDeal priority:", dealErr);
    }

    // =========================================================================
    // 2nd PRIORITY (Fallback): Latest added / edited active offer timer for this state
    // =========================================================================
    if (!activeTimer) {
      // 1. Try to find currently active live timer (latest added/edited first)
      activeTimer = await Offertimer.findOne({
        $and: [
          {
            $or: [
              { timerDisplayStatus: "Yes" },
              { status: "active" },
            ],
          },
          {
            $or: [
              { startDate: { $lte: now }, endDate: { $gt: now } },
              { offer_start: { $lte: now }, offer_end: { $gt: now } },
            ],
          },
          {
            $or: stateMatchOr,
          },
        ],
      })
        .sort({ updatedAt: -1, startDate: -1, offer_start: -1, createdAt: -1 })
        .lean();
    }

    // 2. If still no live timer, find next upcoming timer (e.g. tomorrow's offer)
    if (!activeTimer) {
      activeTimer = await Offertimer.findOne({
        $and: [
          {
            $or: [
              { timerDisplayStatus: "Yes" },
              { status: "active" },
            ],
          },
          {
            $or: [
              { startDate: { $gt: now }, endDate: { $gt: now } },
              { offer_start: { $gt: now }, offer_end: { $gt: now } },
            ],
          },
          {
            $or: stateMatchOr,
          },
        ],
      })
        .sort({ updatedAt: -1, startDate: 1, offer_start: 1, createdAt: 1 })
        .lean();

      if (activeTimer) {
        isUpcoming = true;
      }
    }

    const banner = activeTimer?.topBanner || activeTimer?.top_banner_url || null;
    const top_banner_url = banner
      ? (banner.startsWith("/") ? banner : `/uploads/topbanner/${banner}`)
      : null;

    const popup = activeTimer?.dealsPopupImage || activeTimer?.popup_image_url || null;
    const popup_image_url = popup
      ? (popup.startsWith("/") ? popup : `/uploads/topbanner/${popup}`)
      : null;

    return NextResponse.json(
      {
        success: true,
        region,
        top_banner_url,
        activeTopBanner: top_banner_url,
        timer: activeTimer
          ? {
              ...activeTimer,
              isUpcoming,
              top_banner_url,
              topBanner: top_banner_url,
              dealsPopupImage: popup_image_url,
              popup_image_url,
              startDate: activeTimer.startDate || activeTimer.offer_start,
              endDate: activeTimer.endDate || activeTimer.offer_end,
              offerTitle: activeTimer.offerTitle || activeTimer.offer_title,
              offerHeading: activeTimer.offerHeading || activeTimer.offerTitle || activeTimer.offer_title,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("Global timer error:", err);
    return NextResponse.json(
      { success: false, timer: null, message: err.message },
      { status: 500 }
    );
  }
}
