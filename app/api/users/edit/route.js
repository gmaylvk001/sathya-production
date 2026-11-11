import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUserId } from "@/lib/authRequest";
import { getAdminUserId } from "@/lib/adminRequest";

export async function PUT(req) {
  await dbConnect();

  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, name, last_name, mobile, email, store_id, status } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Customers may only edit their own profile; admins may edit any user
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId && String(userId) !== String(authUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
      _id: { $ne: userId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or mobile already exists" },
        { status: 400 }
      );
    }

    // Profile fields that can be updated by customer; status is admin-only
    const update = { name, last_name, mobile, email };
    if (store_id !== undefined) {
      update.store_id = store_id || null;
    }
    if (adminUserId) {
      if (status !== undefined) update.status = status;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).select("-password -confirmation_code -remember_token");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
