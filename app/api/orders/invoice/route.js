import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EcomOrderInfo from "@/models/ecom_order_info";
import { PassThrough } from "stream";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const order_number = searchParams.get("order_id"); // This should match the `order_number` from your schema

  if (!order_number) {
    return NextResponse.json({ error: "Order number is required" }, { status: 400 });
  }

  try {
    await dbConnect();

    const order = await EcomOrderInfo.findOne({ order_number }); // Query using order_number

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const doc = new PDFDocument();
    const stream = new PassThrough();
    doc.pipe(stream);

    // Invoice Header
    doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();
    doc.fontSize(14).text(`Order Number: ${order.order_number}`);
    doc.text(`Customer Name: ${order.order_username}`);
    doc.text(`Phone Number: ${order.order_phonenumber}`);
    doc.text(`Email: ${order.email_address}`);
    doc.text(`Payment Method: ${order.payment_method}`);
    doc.text(`Delivery Address: ${order.order_deliveryaddress}`);
    doc.text(`Order Status: ${order.order_status}`);
    doc.text(`Payment Status: ${order.payment_status}`);
    doc.moveDown();

    // Order Items
    doc.fontSize(16).text("Items:", { underline: true });
    order.order_item.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. ${item.name} - ₹${item.price}`);
    });

    // Total
    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: ₹${order.order_amount}`, { align: "right" });

    doc.end();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice_${order.order_number}.pdf`,
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
