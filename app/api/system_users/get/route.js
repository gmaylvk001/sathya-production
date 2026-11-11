import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import "@/models/Role";
import { getMappedLiveUserIdSet } from "@/lib/existUserDetailsMap";
import { requireAdmin } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const users = await User.find({ user_type: "admin" })
      .select("-password -confirmation_code -remember_token")
      .populate("role", "name slug")
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
    console.error("Error fetching system users:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

