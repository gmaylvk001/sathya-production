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

export async function GET(req) {
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

    const addresses = await ExistSathyaUserDetail.find({ live_user_id: userId })
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json(
      { success: true, addresses: addresses || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching saved addresses:", error);
    return NextResponse.json(
      { message: "Error fetching addresses", success: false, addresses: [] },
      { status: 500 }
    );
  }
}

export async function POST(req) {
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

    const body = await req.json();

    const newAddressData = {
      live_user_id: userId,
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
      is_default_shipping: !!body.is_default_shipping,
      is_default_billing: !!body.is_default_billing,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Check if this is the first address for the user
    const addressCount = await ExistSathyaUserDetail.countDocuments({ live_user_id: userId });
    
    if (addressCount === 0) {
      // First address becomes default for both
      newAddressData.is_default_shipping = true;
      newAddressData.is_default_billing = true;
    } else {
      // If setting as default, unset existing defaults
      if (newAddressData.is_default_shipping) {
        await ExistSathyaUserDetail.updateMany(
          { live_user_id: userId },
          { $set: { is_default_shipping: false } }
        );
      }
      if (newAddressData.is_default_billing) {
        await ExistSathyaUserDetail.updateMany(
          { live_user_id: userId },
          { $set: { is_default_billing: false } }
        );
      }
    }

    const newAddress = await ExistSathyaUserDetail.create(newAddressData);

    return NextResponse.json(
      { success: true, message: "Address saved successfully", address: newAddress },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving address:", error);
    return NextResponse.json(
      { message: "Error saving address", error: error.message, success: false },
      { status: 500 }
    );
  }
}
