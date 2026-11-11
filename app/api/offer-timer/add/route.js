import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";
import { normalizeOfferStates } from "@/lib/offerTimer";

async function saveUpload(file, prefix) {
  if (!file || typeof file === "string" || !file.size) return null;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "topbanner");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "") || ".png";
  const cleanName = path.basename(file.name || "image", ext).replace(/\s+/g, "_");
  const filename = `${prefix}-${Date.now()}-${cleanName}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/topbanner/${filename}`;
}


export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const offerTitle = String(formData.get("offerTitle") || "").trim();
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const selectedStates = formData.getAll("offerViewStates");
    const timerDisplayStatus = formData.get("timerDisplayStatus") === "No" ? "No" : "Yes";
    const offerHeading = String(formData.get("offerHeading") || "").trim();
    const offerDescription = String(formData.get("offerDescription") || "").trim();

    if (!offerTitle || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Offer title, start date and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid start or end date" }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ success: false, error: "End date must be after start date" }, { status: 400 });
    }

    const last = await OfferTimer.findOne().sort({ timerId: -1 }).select("timerId").lean();
    const timerId = (last?.timerId || 0) + 1;
    const states = normalizeOfferStates(selectedStates);

    const topBanner = await saveUpload(formData.get("topBanner"), "top-banner");
    const dealsPopupImage = await saveUpload(formData.get("dealsPopupImage"), "deals-popup");

    const timer = await OfferTimer.create({
      timerId,
      custom_id: timerId,
      offerTitle,
      offer_title: offerTitle,
      startDate: start,
      offer_start: start,
      endDate: end,
      offer_end: end,
      state: states.state,
      offerViewStates: states.offerViewStates,
      states: states.offerViewStates,
      timerDisplayStatus,
      status: timerDisplayStatus === "Yes" ? "active" : "inactive",
      offerHeading,
      offerDescription,
      topBanner,
      top_banner_url: topBanner,
      dealsPopupImage,
      popup_image_url: dealsPopupImage || null,
    });

    return NextResponse.json({ success: true, message: "Offer timer added successfully", data: timer }, { status: 201 });
  } catch (error) {
    console.error("Error adding offer timer:", error);
    return NextResponse.json({ success: false, error: "Error adding offer timer", message: error.message }, { status: 500 });
  }
}
