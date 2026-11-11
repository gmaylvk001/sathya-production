import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "1",
      user_id: "1436",
      address: "12 Main Street",
      address1: "Near Park",
      address2: "",
      pincode: 600001,
      username: "sampleuser",
      locality: "T Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      landmark: "Bus stop",
      phonenumber: "9876543210",
      altnumber: "9123456780",
      type: "shipping",
      gst_name: "Sample GST Name",
      gst_number: "33AAAAA0000A1Z5",
      gst_bnm: "",
      gst_st: "",
      gst_loc: "",
      gst_bno: "",
      gst_stcd: "",
      gst_dst: "",
      gst_city: "",
      gst_flno: "",
      gst_lt: "",
      gst_pncd: "",
      gst_lg: "",
      created_at: "2020-03-24 04:33:48",
      updated_at: "2020-04-24 04:55:16",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "UserDetails");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_user_details_sample.xlsx",
    },
  });
}
