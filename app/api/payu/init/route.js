import { NextResponse } from "next/server";
import { getPayuConfig, generatePayuHash } from "@/lib/payu";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { findRelatedOrders } from "@/lib/orderPayment";

/**
 * POST /api/payu/init
 * Generates PayU checkout parameters and hash for Unilet / Karnataka orders.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      order_number,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      user_id,
    } = body;

    if (!order_number) {
      return NextResponse.json(
        { success: false, error: "order_number is required" },
        { status: 400 }
      );
    }

    // Always use server-side checkout total — sum all sibling line orders
    const exactOrder = await OrderNew.findOne({ order_number: String(order_number) }).lean();
    if (!exactOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const related = await findRelatedOrders(
      String(order_number),
      exactOrder.user_id || user_id
    );

    const serverAmount = related.reduce(
      (sum, o) => sum + (Number(o.order_amount) || 0),
      0
    );
    if (!serverAmount || serverAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid order amount" },
        { status: 400 }
      );
    }

    const { key, actionUrl } = getPayuConfig();
    const txnid = `TXN_${order_number}_${Date.now()}`;
    const { getSiteUrl } = await import("@/lib/siteUrl");
    const baseUrl = getSiteUrl();
    const surl = `${baseUrl}/api/payu/status?txnid=${encodeURIComponent(txnid)}`;
    const furl = `${baseUrl}/api/payu/status?txnid=${encodeURIComponent(txnid)}`;

    const {
      hash,
      formattedAmount,
      cleanProductInfo,
      cleanFirstName,
      cleanEmail,
    } = generatePayuHash({
      txnid,
      amount: serverAmount,
      productinfo: productinfo || `Order #${order_number}`,
      firstname: firstname || "Customer",
      email: email || "customer@example.com",
      udf1: String(order_number),
      udf2: String(user_id || exactOrder.user_id || ""),
      udf3: "unilet",
      udf4: "",
      udf5: "",
    });

    // Tag every line in this checkout group with the txn id
    const relatedIds = related.map((o) => o._id).filter(Boolean);
    await OrderNew.updateMany(
      relatedIds.length
        ? { _id: { $in: relatedIds } }
        : { order_number: String(order_number) },
      {
        $set: {
          online_pay_refid: txnid,
          payment_mode: "PayU",
          payment_type: "PayU",
          payment_method: "online",
        },
      }
    );

    const params = {
      key,
      txnid,
      amount: formattedAmount,
      productinfo: cleanProductInfo,
      firstname: cleanFirstName,
      email: cleanEmail,
      phone: String(phone || "").replace(/\D/g, "").slice(-10) || "9999999999",
      surl,
      furl,
      hash,
      service_provider: "payu_paisa",
      udf1: String(order_number),
      udf2: String(user_id || ""),
      udf3: "unilet",
      udf4: "",
      udf5: "",
    };

    return NextResponse.json({
      success: true,
      action: actionUrl,
      params,
    });
  } catch (error) {
    console.error("[PayU Init Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize PayU" },
      { status: 500 }
    );
  }
}
