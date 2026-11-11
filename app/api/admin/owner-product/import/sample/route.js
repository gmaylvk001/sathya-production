import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    { reference_item_code: "QA55S90H", vendor_item_code: "QA55S90H", stock: 63, stock_status: "In Stock" },
    { reference_item_code: "WDFS3R15SL", vendor_item_code: "WDFS3R15SL", stock: 0, stock_status: "Out of Stock" },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Unilet Products");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=unilet_products_import_sample.xlsx",
    },
  });
}
