import { NextResponse } from 'next/server'; 
import connectDB from "@/lib/db"; 
import mapbox from "@/models/mapbox";


export async function DELETE(req) {
  const { storeId } = await req.json();

  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }

  try {
    await connectDB();

    const updatedStore = await mapbox.findByIdAndUpdate(
      storeId,
      { status: "Inactive" },
      { new: true, runValidators: true } 
    );

    if (!updatedStore) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Store status updated to Inactive.", store: updatedStore }, { status: 200 });
  } catch (error) {
    console.error("Error inactivating store:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// You can also add other HTTP methods here if needed, e.g., GET for fetching a single store:
/*
export async function GET(request, { params }) {
  const { storeId } = params;

  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }

  try {
    await connectDB();
    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
*/