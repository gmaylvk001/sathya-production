import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreOwners from "@/models/store_owners";
import { parseStoreOwnerBody, escapeRegex } from "@/lib/storeOwners";

export async function POST(req) {
  try {
    await dbConnect();

    const { data, error } = parseStoreOwnerBody(await req.json());
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const existing = await StoreOwners.findOne({
      store_name: { $regex: `^${escapeRegex(data.store_name)}$`, $options: "i" },
    }).lean();
    if (existing) {
      return NextResponse.json({ error: "Store name already exists" }, { status: 400 });
    }

    // Price On / Stock On are hidden in the form; new store owners always start off.
    await StoreOwners.create({ ...data, price_on: 0, stock_on: 0 });
    return NextResponse.json({ success: true, message: "Store owner created successfully" }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Store name already exists" }, { status: 400 });
    }
    console.error("Error creating store owner:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
