import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await dbConnect();
    
    const { name, mobile, email, password, user_type, status } = await req.json();
    
    if (!name || !mobile || !email || !password || !status) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate user_type
    const validUserTypes = ["admin", "user"];
    const finalUserType = validUserTypes.includes(user_type) ? user_type : "user";
        // ✅ Validate mobile number (10 digits only)
    if (!/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // ✅ Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ✅ Check only for duplicate email, NOT mobile
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

     // ✅ Check for duplicate mobile (if you want to restrict duplicates)
    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return NextResponse.json(
        { error: "Mobile number already exists" },
        { status: 400 }
      );
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      mobile, // ✅ Allow duplicate mobile numbers
      email,
      password: hashedPassword,
      user_type: finalUserType,
      status, // Include status field
    });

    await newUser.save();

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });

  } catch (error) {
    // console.error("❌ Error in /api/users/add:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}