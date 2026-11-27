import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "18",
      user_id: "150998",
      order_number: "20230610_OL_945807",
      refund_id: "rfnd_M0W37uZTqbsSqx",
      refund_amount: "20999",
      actual_paid_amount: "20999",
      created_at: "2023-06-11 05:59:32",
      updated_at: "2023-06-11 05:59:33",
      payment_id: "17793",
      error_msg: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Refund");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_payment_refund_sample.xlsx",
    },
  });
}
