import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaUser from "@/models/ExistSathyaUser";
import bcrypt from "bcryptjs";

function emptyToNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

export async function PUT(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const {
      userId,
      exist_id,
      first_name,
      last_name,
      store_id,
      role_id,
      zone_id,
      email,
      phone,
      password,
      remember_token,
      confirmed,
      confirmation_code,
      provider,
      provider_id,
      avatar,
      avatar_original,
      notify_pincode,
      notify_status,
      logged_in,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!phone || !String(phone).trim()) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    const user = await ExistSathyaUser.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const emailValue = emptyToNull(email) === null ? null : String(email).trim().toLowerCase();
    if (emailValue) {
      const existingUser = await ExistSathyaUser.findOne({
        email: emailValue,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    const updateData = {
      exist_id: emptyToNull(exist_id) === null ? null : String(exist_id).trim(),
      first_name: emptyToNull(first_name)?.trim?.() || emptyToNull(first_name),
      last_name: emptyToNull(last_name)?.trim?.() || emptyToNull(last_name),
      store_id: emptyToNull(store_id),
      role_id: emptyToNull(role_id),
      zone_id: emptyToNull(zone_id),
      email: emailValue,
      phone: phone.trim(),
      remember_token: emptyToNull(remember_token),
      confirmed: confirmed === "" || confirmed === undefined ? null : Number(confirmed),
      confirmation_code: emptyToNull(confirmation_code),
      provider: emptyToNull(provider),
      provider_id: emptyToNull(provider_id),
      avatar: emptyToNull(avatar),
      avatar_original: emptyToNull(avatar_original),
      notify_pincode: emptyToNull(notify_pincode),
      notify_status: notify_status === "" || notify_status === undefined ? 0 : Number(notify_status),
      logged_in: emptyToNull(logged_in),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await ExistSathyaUser.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
