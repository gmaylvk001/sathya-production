import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User, { ADMIN_STORE_VIEWS } from "@/models/User";
import Role from "@/models/Role";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    
    const { name, mobile, email, password, status, role, admin_store_view, store_id } = await req.json();
    
    if (!name || !mobile || !email || !password || !status) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const storeView = admin_store_view || "sathya";
    if (!ADMIN_STORE_VIEWS.includes(storeView)) {
      return NextResponse.json({ error: "Invalid admin store view" }, { status: 400 });
    }

    const storeId = store_id != null && String(store_id).trim() !== "" ? String(store_id).trim() : null;
    if (storeId) {
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ error: "Invalid store selected" }, { status: 400 });
      }
      const StoreListing = (await import("@/models/store_listings")).default;
      const storeDoc = await StoreListing.findById(storeId).select("_id").lean();
      if (!storeDoc) {
        return NextResponse.json({ error: "Selected store not found" }, { status: 400 });
      }
    }

    if (!/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return NextResponse.json(
        { error: "Mobile number already exists" },
        { status: 400 }
      );
    }

    let roleId = null;
    if (role) {
      if (!mongoose.Types.ObjectId.isValid(role)) {
        return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
      }
      const existingRole = await Role.findById(role);
      if (!existingRole) {
        return NextResponse.json({ error: "Selected role not found" }, { status: 400 });
      }
      roleId = role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      mobile,
      email,
      password: hashedPassword,
      user_type: "admin",
      status,
      role: roleId,
      admin_store_view: storeView,
      store_id: storeId,
    });

    await newUser.save();

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
