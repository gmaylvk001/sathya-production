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


export async function PUT(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const id = formData.get("id");
    const offerTitle = String(formData.get("offerTitle") || "").trim();
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const selectedStates = formData.getAll("offerViewStates");
    const timerDisplayStatus = formData.get("timerDisplayStatus") === "No" ? "No" : "Yes";
    const offerHeading = String(formData.get("offerHeading") || "").trim();
    const offerDescription = String(formData.get("offerDescription") || "").trim();

    if (!id || !offerTitle || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "ID, offer title, start date and end date are required" },
        { status: 400 }
      );
    }

    let existing = null;
    try {
      existing = await OfferTimer.findById(id);
    } catch (e) {
      // invalid object id format
    }

    if (!existing) {
      const num = Number(id);
      if (!Number.isNaN(num)) {
        existing = await OfferTimer.findOne({ $or: [{ timerId: num }, { custom_id: num }] });
      }
    }

    if (!existing) {
      existing = await OfferTimer.findOne().sort({ createdAt: -1 });
    }

    if (!existing) {
      // If no timer at all, create a new one
      existing = new OfferTimer({ timerId: 1, custom_id: 1 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid start or end date" }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ success: false, error: "End date must be after start date" }, { status: 400 });
    }

    const states = normalizeOfferStates(selectedStates);
    
    const removeTopBanner = formData.get("removeTopBanner") === "true";
    const newTopBanner = await saveUpload(formData.get("topBanner"), "top-banner");
    const topBanner = newTopBanner || (removeTopBanner ? null : existing.topBanner);

    const removeDealsPopupImage = formData.get("removeDealsPopupImage") === "true";
    const newPopup = await saveUpload(formData.get("dealsPopupImage"), "deals-popup");
    const dealsPopupImage = newPopup || (removeDealsPopupImage ? null : existing.dealsPopupImage);

    existing.offerTitle = offerTitle;
    existing.offer_title = offerTitle;
    existing.startDate = start;
    existing.offer_start = start;
    existing.endDate = end;
    existing.offer_end = end;
    existing.state = states.state;
    existing.offerViewStates = states.offerViewStates;
    existing.states = states.offerViewStates;
    existing.timerDisplayStatus = timerDisplayStatus;
    existing.status = timerDisplayStatus === "Yes" ? "active" : "inactive";
    existing.offerHeading = offerHeading;
    existing.offerDescription = offerDescription;
    existing.topBanner = topBanner;
    existing.top_banner_url = topBanner;
    existing.dealsPopupImage = dealsPopupImage;
    existing.popup_image_url = dealsPopupImage || existing.popup_image_url;
    await existing.save();

    return NextResponse.json({ success: true, message: "Offer timer updated successfully", data: existing }, { status: 200 });

  } catch (error) {
    console.error("Error updating offer timer:", error);
    return NextResponse.json({ success: false, error: "Error updating offer timer", message: error.message }, { status: 500 });
  }
}
