import dbConnect from "@/lib/db";
import User from "@/models/ecom_contact_info";
import { NextResponse } from "next/server";
export  async function DELETE(req) {

  
  const { id } = await req.json();

console.log(id)
    if (!id) {
      return NextResponse.json({ success: false, message: "ID is required" });
    }

    try {
      await dbConnect();
      console.log("Database connected successfully");

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { status: "inactive" },
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json({ success: false, message: "User not found" });
      }

      return NextResponse.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error("Error updating user status:", error);
      return NextResponse.json({ success: false, message: "Internal Server Error" });
    }
  
}