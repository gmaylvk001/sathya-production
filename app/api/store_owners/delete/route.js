import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreOwners from "@/models/store_owners";

export async function DELETE(req) {
  try {
    await dbConnect();

    const { storeOwnerId } = await req.json();
    if (!mongoose.Types.ObjectId.isValid(String(storeOwnerId || ""))) {
      return NextResponse.json({ error: "Store owner ID is required" }, { status: 400 });
    }

    const deleted = await StoreOwners.findByIdAndDelete(storeOwnerId);
    if (!deleted) {
      return NextResponse.json({ error: "Store owner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Store owner deleted successfully" });
  } catch (error) {
    console.error("Error deleting store owner:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
