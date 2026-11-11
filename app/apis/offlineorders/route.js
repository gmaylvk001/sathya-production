import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";

export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();

    // Log the request data for debugging
    console.log("getOfflineorders: ", JSON.stringify(data));

    let CustomerPhoneNumber = data.CustomerPhoneNumber;
    const OrderId = data.OrderId;
    const OrderDate = data.OrderDate;
    const Invoice = data.Invoice;
    const branch = data.BranchCode;

    if (CustomerPhoneNumber) {
      CustomerPhoneNumber = CustomerPhoneNumber.toString().slice(-10);
    } else {
      return new Response("Mobile number is not valid", { status: 400 });
    }

    // Check if the user exists
    let user = await User.findOne({ mobile: CustomerPhoneNumber });

    if (!user) {
      // Create user if not found
      user = await User.create({
        mobile: CustomerPhoneNumber,
        provider: "OTP",
        confirmed: 1,
      });
    }

    if (user) {
      // Create Order with default fields to prevent website UI from breaking
      const order = new OrderNew({
        order_username: user.name || "Customer",
        email_address: user.email || null,
        order_phonenumber: CustomerPhoneNumber,
        order_number: OrderId,
        offline_order_date: OrderDate ? new Date(OrderDate) : null,
        invoice: Invoice,
        user_id: user._id,
        pickup_store: branch,
        pickup_type: branch,
        type: "offline",
        order_amount: "0",
        payment_status: "pending",
        order_status: "pending",
        netamt: "0",
        order_item: [
          {
            id: 1,
            name: null,
            price: 0,
            item_code: null,
            model: null,
            coupondiscount: 0,
            coupondetails: [],
            quantity: 1,
            store_id: null,
            warranty: 0,
            extendedWarranty: 0,
            warrantyData: {
              item_no: null,
              name: null,
              year: null,
              price: null
            },
            image: null,
            original_quantity: 1,
            discount: 0,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      });
      await order.save();

      // Create Order Detail
      const orderDetail = new OrderDetailsNew({
        orderNumber: OrderId,
        user_id: user._id,
        type: "offline",
        order_id: order._id,
        quantity: 1,
        product_price: "0",
      });
      await orderDetail.save();

      // Returning exact string 'success' as per the PHP API structure
      return new Response("success", { status: 200 });
    } else {
      return new Response("error", { status: 500 });
    }
  } catch (error) {
    console.error("Error in getOfflineorders API:", error);
    return new Response("error", { status: 500 });
  }
}
