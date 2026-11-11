import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";
import jwt from "jsonwebtoken";

const extractToken = (req) => {
  const authHeader = req.headers.get("authorization");
  return authHeader?.split(" ")[1] || null;
};

const verifyTokenSafe = (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
};

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = extractToken(req);
    const userId = verifyTokenSafe(token);

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();

    // Verify ownership
    const existingAddress = await ExistSathyaUserDetail.findOne({ _id: id, live_user_id: userId });
    if (!existingAddress) {
      return NextResponse.json(
        { message: "Address not found or unauthorized", success: false },
        { status: 404 }
      );
    }

    const is_default_shipping = !!body.is_default_shipping;
    const is_default_billing = !!body.is_default_billing;

    // Handle default unsetting if this address is being set as new default
    if (is_default_shipping && !existingAddress.is_default_shipping) {
      await ExistSathyaUserDetail.updateMany(
        { live_user_id: userId, _id: { $ne: id } },
        { $set: { is_default_shipping: false } }
      );
    }
    
    if (is_default_billing && !existingAddress.is_default_billing) {
      await ExistSathyaUserDetail.updateMany(
        { live_user_id: userId, _id: { $ne: id } },
        { $set: { is_default_billing: false } }
      );
    }

    // Prevent unsetting default if it's the only one (optional, but good practice)
    // For simplicity, we just allow the update

    const updatedAddress = await ExistSathyaUserDetail.findByIdAndUpdate(
      id,
      {
        $set: {
          username: body.full_name,
          phonenumber: body.phone,
          altnumber: body.alternate_phone || "",
          address1: body.address_line1,
          address2: body.address_line2 || "",
          locality: body.locality || "",
          landmark: body.landmark || "",
          pincode: body.pincode,
          city: body.city,
          state: body.state,
          type: body.address_type || "home",
          is_default_shipping,
          is_default_billing,
          updated_at: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json(
      { success: true, message: "Address updated successfully", address: updatedAddress },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { message: "Error updating address", error: error.message, success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = extractToken(req);
    const userId = verifyTokenSafe(token);

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const { id } = params;

    // Find and verify ownership
    const addressToDelete = await ExistSathyaUserDetail.findOne({ _id: id, live_user_id: userId });
    if (!addressToDelete) {
      return NextResponse.json(
        { message: "Address not found or unauthorized", success: false },
        { status: 404 }
      );
    }

    const wasDefaultShipping = addressToDelete.is_default_shipping;
    const wasDefaultBilling = addressToDelete.is_default_billing;

    await ExistSathyaUserDetail.deleteOne({ _id: id });

    if (wasDefaultShipping || wasDefaultBilling) {
      const remainingAddress = await ExistSathyaUserDetail.findOne({ live_user_id: userId });
      if (remainingAddress) {
        const updates = {};
        if (wasDefaultShipping) updates.is_default_shipping = true;
        if (wasDefaultBilling) updates.is_default_billing = true;
        
        await ExistSathyaUserDetail.updateOne(
          { _id: remainingAddress._id },
          { $set: updates }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: "Address deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { message: "Error deleting address", error: error.message, success: false },
      { status: 500 }
    );
  }
}
