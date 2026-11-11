import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreOwners from "@/models/store_owners";
import { parseStoreOwnerBody, escapeRegex } from "@/lib/storeOwners";

export async function PUT(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const storeOwnerId = String(body.storeOwnerId || "");
    if (!mongoose.Types.ObjectId.isValid(storeOwnerId)) {
      return NextResponse.json({ error: "Store owner ID is required" }, { status: 400 });
    }

    const { data, error } = parseStoreOwnerBody(body);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const duplicate = await StoreOwners.findOne({
      _id: { $ne: storeOwnerId },
      store_name: { $regex: `^${escapeRegex(data.store_name)}$`, $options: "i" },
    }).lean();
    if (duplicate) {
      return NextResponse.json({ error: "Store name already exists" }, { status: 400 });
    }

    const updated = await StoreOwners.findByIdAndUpdate(
      storeOwnerId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) {
      return NextResponse.json({ error: "Store owner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Store owner updated successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Store name already exists" }, { status: 400 });
    }
    console.error("Error updating store owner:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
