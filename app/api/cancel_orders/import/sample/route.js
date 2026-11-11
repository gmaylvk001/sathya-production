import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const SAMPLE_ROWS = [
  {
    id: 10773,
    order_number: "20260921_OL_323367",
    order_id: 840494,
    customer_id: 1,
    order_status: "ordered",
    reason: "expensive",
    comments: "by mistakly buy",
    created_at: "21-09-2026 17:28",
    updated_at: "21-09-2026 17:28",
  },
  {
    id: 10772,
    order_number: "20260601_OL_977887",
    order_id: 840389,
    customer_id: 1,
    order_status: "ordered",
    reason: "",
    comments: "No stock",
    created_at: "01-06-2026 15:51",
    updated_at: "01-06-2026 15:51",
  },
];

export async function GET(req) {
  const format = new URL(req.url).searchParams.get("format");
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=cancel_orders_sample.csv",
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "cancel_orders");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cancel_orders_sample.xlsx",
    },
  });
}
