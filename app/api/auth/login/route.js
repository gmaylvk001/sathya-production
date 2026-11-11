import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Cart from "@/models/ecom_cart_info";
//import Product from "@/models/product";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, password, guestId } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email is invalid", errorType: "email" }, 
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Email is incorrect or not registered", errorType: "email" }, 
        { status: 400 }
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Password is incorrect", errorType: "password" }, 
        { status: 400 }
      );
    }

    // Create a JWT token
    const token = jwt.sign(
      { 
        userId: existingUser._id, 
        email: existingUser.email,
        name: existingUser.name 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "12h" }
    );

    //return NextResponse.json({ test_vk: guestId });
    // ✅ Merge guest cart → user cart
    let cartCount = 0;
    if (guestId) {
      const guestCart = await Cart.findOne({ guestId });
      let userCart = await Cart.findOne({ userId: existingUser._id });

      //return NextResponse.json({ test_vk: guestCart });

      if (guestCart) {
        if (userCart) {
          // merge items
          for (const guestItem of guestCart.items) {
            const existingItem = userCart.items.find(
              (item) => item.productId.toString() === guestItem.productId.toString()
            );
            if (existingItem) {
              existingItem.quantity += guestItem.quantity;
            } else {
              userCart.items.push(guestItem);
            }
          }
          userCart.totalItems = userCart.items.reduce((sum, i) => sum + i.quantity, 0);
          await userCart.save();

          cartCount = userCart.totalItems;
          await Cart.deleteOne({ guestId }); // cleanup
        } else {
          // move guest cart to user
          guestCart.userId = existingUser._id;
          guestCart.guestId = null; 
          await guestCart.save();

          cartCount = guestCart.totalItems;
        }
      } else if (userCart) {
        cartCount = userCart.totalItems;
      }
    } else {
      // no guestId, just check userCart
      const userCart = await Cart.findOne({ userId: existingUser._id });
      cartCount = userCart?.totalItems || 0;
    }

    return NextResponse.json(
      { 
        message: "Login successful", 
        token,
        user: {
          name: existingUser.name,
          email: existingUser.email,
          userId: existingUser._id, 
          role : existingUser.user_type, 

        }
      }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}