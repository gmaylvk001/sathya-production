import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { getAdminUserId } from "@/lib/adminRequest";
import { buildInvoiceUrl, invoiceFileName } from "@/lib/orderInvoice";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { orderId } = await params;

    if (!(await getAdminUserId(req))) {
      return NextResponse.json({ success: false, message: "Admin login required" }, { status: 401 });
    }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const order = await OrderNew.findById(orderId).select("order_number file_path").lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const url = buildInvoiceUrl(order.file_path);
    if (!url) {
      return NextResponse.json({ success: false, message: "Invoice not generated yet" }, { status: 404 });
    }

    const file = await fetch(url, { cache: "no-store" });
    if (!file.ok || !file.body) {
      console.error("order invoice fetch failed:", order.order_number, file.status, url);
      return NextResponse.json({ success: false, message: "Invoice file not found" }, { status: 404 });
    }

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceFileName(order.order_number)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("order invoice error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Invoice download failed" },
      { status: 500 }
    );
  }
}
