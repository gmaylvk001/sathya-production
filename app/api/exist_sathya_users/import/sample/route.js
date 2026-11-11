import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      exist_id: "1",
      first_name: "Administrator",
      last_name: "",
      store_id: "",
      role_id: "",
      zone_id: "",
      email: "admin@example.com",
      phone: "9876543210",
      password: "Password@123",
      confirmed: "",
      notify_pincode: "",
      notify_status: 0,
      created_at: "2024-01-15 10:00:00",
      updated_at: "2024-01-16 12:00:00",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_users_sample.xlsx",
    },
  });
}
