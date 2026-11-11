import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getMappedLiveUserIdSet } from "@/lib/existUserDetailsMap";
import { getAdminUserId } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { message: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    await dbConnect();
    const users = await User.find({ user_type: "user" })
      .select(
        "_id name last_name email mobile user_type role status store_id exist_id notify_status notify_pincode orders_fetched avatar createdAt updatedAt"
      )
      .lean();

    const mapped = await getMappedLiveUserIdSet(users.map((user) => user._id));
    const data = users.map((user) => {
      const { password, confirmation_code, remember_token, ...safeUser } = user;
      return {
        ...safeUser,
        details_fetched: mapped.has(String(user._id)),
      };
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

