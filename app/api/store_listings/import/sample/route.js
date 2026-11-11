import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "1",
      branch_code: "MDU1",
      categories: "1,2",
      user_id: 1,
      title: "Sathya Madurai Main",
      slug: "sathya-madurai-main",
      description: "Sample store listing",
      approved: 1,
      verified: 1,
      spam: 0,
      logo: "",
      image1: "",
      image2: "",
      image3: "",
      phone: "9876543210",
      phone_afterhours: "",
      website: "https://sathya.store",
      email: "store@example.com",
      facebook: "",
      twitter: "",
      service_area: "Madurai",
      images: "",
      tags: "electronics",
      address: "12 Main Road, Madurai",
      latitude: "9.9252",
      longitude: "78.1198",
      meta_title: "Madurai Store",
      meta_description: "Sathya store Madurai",
      zipcode: 625001,
      zone_code: 1,
      is_WH: 0,
      map_data: "",
      location_insights_id: "",
      instagram_stories: "",
      store_owner: "sathya",
      created_at: "2024-01-15 10:00:00",
      updated_at: "2024-01-15 10:00:00",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Listings");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=store_listings_sample.xlsx",
    },
  });
}
