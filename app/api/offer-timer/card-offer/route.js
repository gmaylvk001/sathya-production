import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";
import { deleteCardOfferImages } from "@/lib/cardOffers/cardOfferFileService";

async function saveUpload(file, prefix = "card-offer") {
  if (!file || typeof file === "string" || !file.size) return null;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "cardoffers");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "") || ".png";
  const cleanName = path.basename(file.name || "image", ext).replace(/\s+/g, "_");
  const filename = `${prefix}-${Date.now()}-${cleanName}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/cardoffers/${filename}`;
}

async function findTimer(timerId) {
  if (!timerId) return null;
  let timer = null;

  // Try by ObjectId
  try {
    timer = await OfferTimer.findById(timerId);
  } catch (e) {
    // Not a valid ObjectId
  }

  // Try by numeric timerId or custom_id
  if (!timer) {
    const num = Number(timerId);
    if (!Number.isNaN(num)) {
      timer = await OfferTimer.findOne({ $or: [{ timerId: num }, { custom_id: num }] });
    }
  }

  return timer;
}

// GET: Fetch card offers for a specific timer or all
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const timerId = searchParams.get("timerId") || searchParams.get("id");

    if (!timerId) {
      return NextResponse.json({ success: false, error: "timerId is required" }, { status: 400 });
    }

    const timer = await findTimer(timerId);
    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    const cardOffers = Array.isArray(timer.card_offers) ? timer.card_offers : [];

    return NextResponse.json(
      {
        success: true,
        data: cardOffers,
        timer: {
          _id: timer._id,
          timerId: timer.timerId,
          offerTitle: timer.offerTitle || timer.offer_title,
          startDate: timer.startDate || timer.offer_start,
          endDate: timer.endDate || timer.offer_end,
          state: timer.state,
          offerViewStates: timer.offerViewStates,
          status: timer.status || "active",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching card offers:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new card offer
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const timerId = formData.get("timerId");
    const title = String(formData.get("title") || "").trim();
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const state = String(formData.get("state") || "all").trim();

    if (!timerId) {
      return NextResponse.json({ success: false, error: "timerId is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const timer = await findTimer(timerId);
    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    // Determine unique next ID (starting at 1130 if none exist)
    const allTimers = await OfferTimer.find().select("card_offers").lean();
    let maxId = 1129;
    for (const t of allTimers) {
      if (Array.isArray(t.card_offers)) {
        for (const item of t.card_offers) {
          const itemId = Number(item.id || item.Id);
          if (!Number.isNaN(itemId) && itemId > maxId) {
            maxId = itemId;
          }
        }
      }
    }
    const nextId = maxId + 1;

    const uploadedImage = await saveUpload(formData.get("image"));

    const start = startDate ? new Date(startDate) : (timer.startDate || new Date());
    const end = endDate ? new Date(endDate) : (timer.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const newOffer = {
      id: nextId,
      Id: nextId,
      title,
      image: uploadedImage || null,
      offerTimerId: timer.timerId || Number(timerId) || 1,
      OfferTimerID: timer.timerId || Number(timerId) || 1,
      startDate: start,
      endDate: end,
      state: state || "all",
      status: "active",
      createdAt: new Date(),
    };

    if (!Array.isArray(timer.card_offers)) {
      timer.card_offers = [];
    }

    timer.card_offers.push(newOffer);
    timer.markModified("card_offers");
    await timer.save();

    return NextResponse.json(
      {
        success: true,
        message: "Card offer added successfully",
        data: newOffer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding card offer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing card offer
export async function PUT(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const timerId = formData.get("timerId");
    const cardOfferId = formData.get("id") || formData.get("cardOfferId");
    const title = String(formData.get("title") || "").trim();
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const state = String(formData.get("state") || "").trim();
    const removeImage = formData.get("removeImage") === "true";

    if (!timerId || !cardOfferId) {
      return NextResponse.json({ success: false, error: "timerId and cardOfferId are required" }, { status: 400 });
    }

    const timer = await findTimer(timerId);
    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    if (!Array.isArray(timer.card_offers)) {
      return NextResponse.json({ success: false, error: "Card offer not found" }, { status: 404 });
    }

    const targetIdNum = Number(cardOfferId);
    const index = timer.card_offers.findIndex(
      (item) => item.id === targetIdNum || item.Id === targetIdNum || String(item.id) === String(cardOfferId)
    );

    if (index === -1) {
      return NextResponse.json({ success: false, error: "Card offer not found in this timer" }, { status: 404 });
    }

    const existing = timer.card_offers[index];
    const newImage = await saveUpload(formData.get("image"));

    // If new image is uploaded or image is removed, safely cleanup old image file from disk
    if (existing.image && (newImage || removeImage) && existing.image !== newImage) {
      await deleteCardOfferImages([existing.image], {
        targetTimerId: timer._id || timer.timerId || timerId,
        deletingOfferIds: [targetIdNum],
      });
    }

    const updated = {
      ...existing,
      title: title || existing.title,
      state: state || existing.state || "all",
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      image: newImage || (removeImage ? null : existing.image),
      updatedAt: new Date(),
    };

    timer.card_offers[index] = updated;
    timer.markModified("card_offers");
    await timer.save();

    return NextResponse.json(
      {
        success: true,
        message: "Card offer updated successfully",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating card offer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete single card offer or bulk delete multiple card offers from DB and local disk
export async function DELETE(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { timerId, cardOfferId, cardOfferIds } = body;

    if (!timerId) {
      return NextResponse.json({ success: false, error: "timerId is required" }, { status: 400 });
    }

    const timer = await findTimer(timerId);
    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    if (!Array.isArray(timer.card_offers)) {
      timer.card_offers = [];
      return NextResponse.json({ success: true, message: "No card offers to delete", data: [] }, { status: 200 });
    }

    const idsToDelete = new Set();
    if (Array.isArray(cardOfferIds) && cardOfferIds.length > 0) {
      cardOfferIds.forEach((id) => {
        idsToDelete.add(String(id));
        idsToDelete.add(Number(id));
      });
    } else if (cardOfferId !== undefined && cardOfferId !== null) {
      idsToDelete.add(String(cardOfferId));
      idsToDelete.add(Number(cardOfferId));
    } else {
      return NextResponse.json({ success: false, error: "cardOfferId or cardOfferIds required" }, { status: 400 });
    }

    // 1. Identify records matching the deletion criteria
    const itemsToDelete = timer.card_offers.filter((item) => {
      const match1 = idsToDelete.has(item.id);
      const match2 = idsToDelete.has(String(item.id));
      const match3 = idsToDelete.has(item.Id);
      const match4 = idsToDelete.has(String(item.Id));
      return match1 || match2 || match3 || match4;
    });

    if (itemsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No matching card offers found to delete",
        deletedCount: 0,
        deletedFilesCount: 0,
        data: timer.card_offers,
      });
    }

    // 2. Collect image paths and IDs of deleted items
    const imagePathsToDelete = itemsToDelete
      .map((item) => item.image)
      .filter((img) => img && typeof img === "string" && img.trim() !== "");

    const deletingOfferIds = itemsToDelete.map((item) => item.id ?? item.Id);

    // 3. Remove records from timer.card_offers in DB
    const beforeCount = timer.card_offers.length;
    timer.card_offers = timer.card_offers.filter((item) => {
      const match1 = idsToDelete.has(item.id);
      const match2 = idsToDelete.has(String(item.id));
      const match3 = idsToDelete.has(item.Id);
      const match4 = idsToDelete.has(String(item.Id));
      return !match1 && !match2 && !match3 && !match4;
    });

    const deletedCount = beforeCount - timer.card_offers.length;
    timer.markModified("card_offers");
    await timer.save();

    // 4. Safely delete the physical image files from disk with strict isolation
    const deletedFilesCount = await deleteCardOfferImages(imagePathsToDelete, {
      targetTimerId: timer._id || timer.timerId || timerId,
      deletingOfferIds,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${deletedCount} card offer(s) and ${deletedFilesCount} file(s) successfully`,
        deletedCount,
        deletedFilesCount,
        data: timer.card_offers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting card offer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

