import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModule from "@/models/OfferModule";
import { generateSlug } from "@/lib/offersHelper";

async function uniqueSlug(baseSlug) {
  let slug = baseSlug;
  let n = 2;
  while (true) {
    const existing = await OfferModule.findOne({ slug });
    if (!existing) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const offerName = data.offerName?.trim();
    const requestedSlug = data.slug?.trim();

    if (!offerName) {
      return NextResponse.json({ success: false, error: "Offer name is required" }, { status: 400 });
    }

    const baseSlug = requestedSlug ? generateSlug(requestedSlug) : generateSlug(offerName);
    if (!baseSlug) {
      return NextResponse.json({ success: false, error: "Invalid offer name or slug" }, { status: 400 });
    }

    if (requestedSlug) {
      const existing = await OfferModule.findOne({ slug: baseSlug });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Slug "${baseSlug}" already exists. Please choose a different slug.` },
          { status: 400 }
        );
      }
    }

    const finalSlug = await uniqueSlug(baseSlug);
    const newOffer = new OfferModule({
      offerName,
      slug: finalSlug,
    });

    await newOffer.save();
    return NextResponse.json(
      { success: true, message: "Offer added successfully", data: newOffer },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/offer-module/add:", error);
    return NextResponse.json(
      { success: false, error: "Error adding offer", message: error?.message },
      { status: 500 }
    );
  }
}
