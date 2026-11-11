import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Coupon from '@/models/ecom_offer_info';
import  dbConnect  from '@/lib/db';
import jwt from "jsonwebtoken";
import Usedcoupon from '@/models/ecom_coupon_track_info';

const extractToken = (req) => {
  const authHeader = req.headers.get("authorization");
  return authHeader?.split(" ")[1];
};

const verifyToken = (token) => {
  if (!token) throw new Error("Authorization token required");
   try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else {
      throw new Error("Invalid token");
    }
  }
};


export async function POST(req) {
  await dbConnect();
  try {
    const token = extractToken(req);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (authErr) {
      return NextResponse.json({ message: authErr.message || 'Unauthorized' }, { status: 401 });
    }
    if (!decoded?.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await req.json();
    const { couponCode, cartItems } = body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ message: 'Cart items are required' }, { status: 400 });
    }

    const coupon = await Coupon.findOne({ offer_code: couponCode });

    if (!coupon) {
      return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const usedcoupon = await Usedcoupon.findOne({ coupon_id: coupon._id, user_id: userObjectId });
    if (usedcoupon) {
      return NextResponse.json({ message: 'This user already used' }, { status: 400 });
    }
    if (coupon.fest_offer_status !== 'active') {
      return NextResponse.json({ message: 'This coupon is not active' }, { status: 400 });
    }

    const currentDate = new Date();
    if (currentDate < new Date(coupon.from_date) || currentDate > new Date(coupon.to_date)) {
      return NextResponse.json({ message: 'This coupon is expired' }, { status: 400 });
    }

    if (coupon.offer_limit && coupon.used_by >= coupon.offer_limit) {
      return NextResponse.json({ message: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // Check user eligibility
    if (coupon.selected_users && coupon.selected_users.length > 0) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      if (!coupon.selected_users.some(id => id.equals(userObjectId))) {
        return NextResponse.json({ message: 'This coupon is not valid for your account' }, { status: 403 });
      }
    }

    // Check product eligibility
    if (coupon.offer_product && coupon.offer_product.length > 0) {
      const productIds = cartItems
        .map((item) => item?.productId || item?.product_id || item?.id || item?._id)
        .filter(Boolean)
        .map((id) => id.toString());
      const validProducts = coupon.offer_product.some((productId) =>
        productIds.includes(productId.toString())
      );

      if (!validProducts) {
        return NextResponse.json({ message: 'This coupon is not valid for any products in your cart' }, { status: 400 });
      }
    }

    // Success response
    return NextResponse.json({
      message: 'Coupon applied successfully',
      coupon: {
        _id: coupon._id,
        offer_code: coupon.offer_code,
        offer_type: coupon.offer_type,
        percentage: coupon.percentage,
        fixed_price: coupon.fixed_price,
        offer_product: coupon.offer_product,
        selected_users: coupon.selected_users,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
