import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { branchConflictMessage, findBranchConflict } from "@/lib/storeListingBranch";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const branchCode = searchParams.get("branch_code") || "";
    const storeOwner = searchParams.get("store_owner") || "sathya";
    const conflict = await findBranchConflict({
      branchCode,
      storeOwner,
      excludeId: searchParams.get("id") || "",
    });
    return NextResponse.json({
      success: true,
      exists: Boolean(conflict),
      message: conflict ? branchConflictMessage(branchCode, storeOwner) : "",
    });
  } catch (error) {
    console.error("Error checking branch code:", error);
    return NextResponse.json({ success: false, message: error.message || "Check failed" }, { status: 500 });
  }
}
