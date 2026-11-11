import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "15",
      user_id: "1436",
      ModeType: "online",
      PaymentMode: "Razorpay",
      ModeReference: "pay_sample123",
      ReferenceDate: "24-03-2020 04:33:48",
      status: "success",
      created_at: "24-03-2020 04:33:48",
      updated_at: "24-03-2020 04:35:00",
      ModeValue: "26990",
      payment_id: "pay_sample123",
      payment_date: "24-03-2020 04:33:48",
      pinelab_plural_orderid: "",
      pinelab_payment_id: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_payments_sample.xlsx",
    },
  });
}
