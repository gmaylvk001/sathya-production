import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import PaymentNewLive from "@/models/payment_new_live";
import UserAddress from "@/models/ecom_user_address_info";

export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();

    // Log the request data for debugging
    console.log("storeofflineOrders: ", JSON.stringify(data));

    const paymentdata = data.Payment;
    const CartDetails = data.Details;
    const OrderDetails = data.SalesOrder;

    // Validate all three sections are present (matching PHP logic)
    if (!paymentdata || !Array.isArray(paymentdata) || paymentdata.length === 0) {
      return new Response("payment details empty", { status: 400 });
    }
    if (!CartDetails || !Array.isArray(CartDetails) || CartDetails.length === 0) {
      return new Response("cart details empty", { status: 400 });
    }
    if (!OrderDetails || !Array.isArray(OrderDetails) || OrderDetails.length === 0) {
      return new Response("Order details empty", { status: 400 });
    }

    // Step 1: Process Payments
    let lastPaymentId = null;
    for (const pdata of paymentdata) {
      const payment = await PaymentNewLive.create({
        orderId: new (await import("mongoose")).default.Types.ObjectId(), // temporary, will update later
        ModeType: pdata.ModeType || null,
        ModeReference: pdata.ModeReference || null,
        ModeValue: pdata.ModeValue || null,
        ReferenceDate: pdata.ReferenceDate ? new Date(pdata.ReferenceDate) : null,
        PaymentMode: pdata.PaymentMode || null,
        status: pdata.PaymentMode === "Cash" ? "Done" : "pending",
      });
      lastPaymentId = payment._id;
    }

    // Step 2: Process Cart Details → save as order_details_new rows
    // (We'll link them to the order after order creation)
    const cartDetailDocs = [];
    for (const cart of CartDetails) {
      cartDetailDocs.push({
        orderNumber: cart.OrderNumber || null,
        quantity: cart.Quantity || 1,
        product_id: cart.ProductCode || null,
        product_price: cart.Amount != null ? String(cart.Amount) : "0",
        model: cart.HSNCode || null,
        store_id: cart.StoreCode || null,
        item_code: cart.ProductCode || null,
        type: "offline",
      });
    }

    // Step 3: Process each SalesOrder
    for (const Order of OrderDetails) {
      const customerPhone = Order.CustomerMobile
        ? Order.CustomerMobile.toString().slice(-10)
        : null;

      // Find or create user
      let user = null;
      if (customerPhone) {
        user = await User.findOne({ mobile: customerPhone });
        if (!user) {
          user = await User.create({
            mobile: customerPhone,
            name: Order.CustomerName || null,
            provider: "OTP",
            confirmed: 1,
          });
        }
      }

      // Create billing address
      const billingAddress = [
        Order.BillingAddress1,
        Order.BillingAddress2,
        Order.BillingAddress3,
      ].filter(Boolean).join(" ");

      const billingFullAddress = [
        billingAddress,
        Order.BillingCityCode,
        Order.BillingStateCode,
        Order.BillingPinCode,
      ].filter(Boolean).join(" ");

      let billingAddrId = null;
      if (user && billingAddress) {
        const billingDoc = await UserAddress.create({
          userId: String(user._id),
          firstName: Order.CustomerName || "Customer",
          address: billingAddress || "N/A",
          postCode: Order.BillingPinCode || "000000",
          city: Order.BillingCityCode || "N/A",
          state: Order.BillingStateCode || "N/A",
          phonenumber: customerPhone || "0000000000",
        });
        billingAddrId = billingDoc._id;
      }

      // Create delivery address
      const deliveryAddress = [
        Order.DeliveryAddress1,
        Order.DeliveryAddress2,
        Order.DeliveryAddress3,
      ].filter(Boolean).join(" ");

      const deliveryFullAddress = [
        deliveryAddress,
        Order.DeliveryCityCode,
        Order.DeliveryStateCode,
        Order.DeliveryPinCode,
      ].filter(Boolean).join(" ");

      let deliveryAddrId = null;
      if (user && deliveryAddress) {
        const deliveryDoc = await UserAddress.create({
          userId: String(user._id),
          firstName: Order.CustomerName || "Customer",
          address: deliveryAddress || "N/A",
          postCode: Order.DeliveryPinCode || "000000",
          city: Order.DeliveryCityCode || "N/A",
          state: Order.DeliveryStateCode || "N/A",
          phonenumber: customerPhone || "0000000000",
        });
        deliveryAddrId = deliveryDoc._id;
      }

      // Calculate total from cart details for this order
      const orderCartItems = cartDetailDocs.filter(
        (c) => c.orderNumber === Order.OrderNumber
      );
      const total = orderCartItems.reduce(
        (sum, item) => sum + (parseFloat(item.product_price) || 0),
        0
      );

      // Build order_item array from cart details
      const orderItems = orderCartItems.map((item, index) => ({
        id: index + 1,
        name: null,
        price: parseFloat(item.product_price) || 0,
        item_code: item.item_code || null,
        model: item.model || null,
        coupondiscount: 0,
        coupondetails: [],
        quantity: item.quantity || 1,
        store_id: item.store_id || null,
        warranty: 0,
        extendedWarranty: 0,
        warrantyData: { item_no: null, name: null, year: null, price: null },
        image: null,
        original_quantity: item.quantity || 1,
        discount: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Create Order
      const orderDoc = await OrderNew.create({
        order_username: Order.CustomerName || "Customer",
        order_phonenumber: customerPhone,
        order_deliveryaddress: deliveryFullAddress || null,
        order_billingaddress: billingFullAddress || null,
        order_amount: String(total),
        order_status: "ordered",
        user_addbillingid: billingAddrId ? String(billingAddrId) : null,
        user_adddeliveryid: deliveryAddrId ? String(deliveryAddrId) : null,
        order_item: orderItems.length > 0 ? orderItems : null,
        type: "offline",
        payment_id: lastPaymentId ? String(lastPaymentId) : null,
        order_number: Order.OrderNumber || null,
        user_id: user ? String(user._id) : null,
        email_address: user?.email || null,
        payment_status: "pending",
        netamt: String(total),
      });

      // Save order_details_new rows linked to this order
      for (const cartItem of orderCartItems) {
        await OrderDetailsNew.create({
          ...cartItem,
          order_id: orderDoc._id,
          user_id: user ? user._id : null,
        });
      }

      // Update payment with correct orderId now that we have the order
      if (lastPaymentId) {
        await PaymentNewLive.updateOne(
          { _id: lastPaymentId },
          {
            $set: {
              orderId: orderDoc._id,
              userId: user ? user._id : null,
              order_number: Order.OrderNumber || null,
              amount: total,
            },
          }
        );
      }
    }

    return new Response("success", { status: 200 });
  } catch (error) {
    console.error("Error in storeofflineOrders API:", error);
    return new Response("error", { status: 500 });
  }
}
