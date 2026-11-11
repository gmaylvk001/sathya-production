import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "101",
      order_history_id: "101",
      order_id: "13",
      order_number: "20200324_OL_4055",
      order_status: "Cancelled",
      notify: 0,
      comment: "Order cancelled by customer",
      created_at: "2020-04-24 04:55:16",
      updated_at: "2020-04-24 04:55:16",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "OrderHistory");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_order_history_sample.xlsx",
    },
  });
}
