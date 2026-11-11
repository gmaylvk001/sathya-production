// import Order from '@/models/ecom_order_info';
import Abandoned from "@/models/ecom_abondant_details";
import Product from "@/models/product";
import { NextResponse } from "next/server";
import dbConnect from '@/lib/db';

export async function GET(req, { params }) {
  await dbConnect();
  const { orderId } = params;

  try {
    const order = await Abandoned.findById(orderId).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const productItemCodes = order.order_details.map(item => {
      // Check if the item_code starts with 'ITEM' and remove it
      if (item.item_code && item.item_code.startsWith('ITEM')) {
        return item.item_code.substring(4); // 'ITEM' is 4 characters long
      }
      return item.item_code;
    });

    console.log("Trimmed Item codes:", productItemCodes);

    const products = await Product.find({ item_code: { $in: productItemCodes } })
      .select("slug item_code")
      .lean();

    // Log the fetched products to check if a match was found
    console.log("Fetched Products:", products);

    order.order_details = order.order_details.map(item => {
      // Find the corresponding product using the original item_code
      const product = products.find(p => {
        const trimmedCode = p.item_code;
        // Compare the trimmed code from the products array with the order item code
        return item.item_code.endsWith(trimmedCode);
      });
      return { ...item, slug: product?.slug || null };
    });

    console.log("Order with Slugs:", order);
    
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* export async function PATCH(req, { params }) {
  await dbConnect();
  const { orderId } = params;
  const { status, comment, customer_notified } = await req.json();

  try {
    const updatedOrder = await Abandoned.findByIdAndUpdate(
      orderId,
      {
        $set: { status }, // update main order status
        $push: {
          order_history: {  // ✅ correct field name
            status,
            comment,
            customer_notified,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

   return NextResponse.json(updatedOrder, { status: 200 });
// return NextResponse.json(
//   {
//     message: "History updated successfully",
//     order: updatedOrder
//   },
//   { status: 200 }
// );

  } catch (err) {
    console.error("❌ Error updating order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} */


export async function PATCH(req, { params }) {
  await dbConnect();
  const { orderId } = params;

  const body = await req.json();
  console.log("Incoming body:", body); // ✅ debug

  const { status, comment, customer_notified, razorpay_payment_id } = body;

  try {
    const updatedOrder = await Abandoned.findByIdAndUpdate(
      orderId,
      {
        $set: { 
          status,
          order_status: status, // 🔥 important
          razorpay_payment_id   // 🔥 save payment id
        },
        $push: {
          order_history: {
            status,
            comment,
            customer_notified,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updatedOrder, { status: 200 });

  } catch (err) {
    console.error("❌ Error updating order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



export async function PUT(req, { params }) {
  await dbConnect();

  const { orderId } = params;

  try {
    const body = await req.json();
    console.log("Incoming update body:", body);

    const { order_status, payment_status, payment_id } = body;

    // ✅ Validation (optional but safe)
    if (!order_status || !payment_status) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Update DB
    const updatedOrder = await Abandoned.findByIdAndUpdate(
      orderId,
      {
        $set: {
          order_status,
          payment_status,
          payment_id,
        },
      },
      {
        new: true,        // ✅ return updated doc
        runValidators: true,
      }
    );

    // ❌ If not found
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    console.log("Updated Order:", updatedOrder);

    // ✅ Success response
    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });

  } catch (error) {
    console.error("Update Error:", error);

    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}