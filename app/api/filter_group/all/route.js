import dbConnect from "@/lib/db";
import Filtergroup from "@/models/ecom_filter_group_infos";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();
  try {
    const filterGroups = await Filtergroup.find({});
    return NextResponse.json(filterGroups, { status: 200 });
  } catch (error) {
    console.error("Error fetching filter groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}