// api/cart/count/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Cart from "@/models/ecom_cart_info";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export async function GET(req) {
  try {
    await connectDB();

    let userId = null;
    let newGuestId = null;
    let guestId = null;
    let guestCartId = null;
    let cart = null;

    // ✅ 1. Check for JWT (logged in user)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        console.warn("Invalid token, fallback to guest");
      }
    }


    

    // ✅ 2. If no userId, check for guestId cookie
    if (!userId) {

      
       const guestId_use = req.headers.get("Guestcartid");
      

      if (guestId_use) {
        guestId = guestId_use;
      } else {
        // ✅ 3. Create new guestId
        newGuestId = uuidv4();
        guestId = newGuestId;
        
      }

      cart = await Cart.findOne({ guestId: guestId })

     // return NextResponse.json({  guestId: guestId });
    }
    else
    {
      cart = await Cart.findOne({ userId: userId })
    }

    //return NextResponse.json({ guestId: guestId });

    // ✅ 4. Fetch cart by userId/guestId
    //const cart = await Cart.findOne({ guestId  });
    //const cart = await Cart.findOne({ guestId: guestId });

    //return NextResponse.json({ guestId: guestId, cart : cart });

    // ✅ 5. Build response
    const response = NextResponse.json({
      count: cart?.totalItems || 0,
    });


    

    return response;
  } catch (error) {
    console.error("Cart count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
