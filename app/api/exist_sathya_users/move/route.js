import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaUser from "@/models/ExistSathyaUser";
import { liveUserType, processExistUserMoves } from "@/lib/moveExistUser";

export async function POST(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existUser = await ExistSathyaUser.findById(id).lean();
    if (!existUser) {
      return NextResponse.json({ error: "Exist user not found" }, { status: 404 });
    }

    const result = await processExistUserMoves([existUser]);
    const skipReason = result.skipped[0]?.reason;

    if (result.moved === 0) {
      const messages = {
        already_moved: "This user is already in Users",
        missing_contact: "Email or phone is required to move this user",
        duplicate_email: "This email already exists in Users",
        duplicate_mobile: "This mobile number already exists in Users",
        insert_failed: "Email or mobile already exists in Users",
      };
      return NextResponse.json({
        error: messages[skipReason] || "Failed to move user",
      }, { status: 400 });
    }

    const created = result.created[0];
    const userType = created?.user_type || liveUserType(existUser.role_id);
    const mappedLabel = result.mappedDetailsCount
      ? ` Mapped ${result.mappedDetailsCount} user detail row(s).`
      : "";

    return NextResponse.json({
      success: true,
      message: result.generatedPassword
        ? `User moved successfully as ${userType}. Generated password: ${result.generatedPassword}.${mappedLabel}`
        : `User moved successfully as ${userType}.${mappedLabel}`,
      user_type: userType,
      userId: created?._id,
      generated_password: result.generatedPassword,
      mapped_details_count: result.mappedDetailsCount,
    }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Email or mobile already exists in Users" }, { status: 400 });
    }
    console.error("Error moving exist sathya user:", error);
    return NextResponse.json({ error: "Failed to move user", message: error.message }, { status: 500 });
  }
}
