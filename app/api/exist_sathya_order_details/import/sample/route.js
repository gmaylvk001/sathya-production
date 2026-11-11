import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "1",
      item_code: "SKU001",
      product_id: "115",
      product_name: "Sample Product",
      product_price: "26990",
      model: "XYZ",
      user_id: "1436",
      created_at: "24-03-2020 04:33:48",
      updated_at: "24-04-2020 04:55:16",
      quantity: 1,
      store_id: "1",
      orderNumber: "20200324_OL_4055",
      coupon_discount: 0,
      is_gift: 0,
      gift_Price_to_apply: 0,
      is_combo: 0,
      warranty_product_code: "",
      is_warranty: 0,
      is_view: 1,
      type: "online",
      is_exchange_offer: 0,
      eo_amount: 0,
      exchange_off_type: "",
      exchange_off_brand: "",
      exchange_off_cond: "",
      exchange_off_pin: "",
      exchange_off_amount: 0,
      special_offer_id: "",
      special_discount_id: "",
      special_discount_type: "",
      special_offer_discount: 0,
      is_special_offer: 0,
      is_checkout_offer: 0,
      checkout_offer_type: "",
      checkout_offer_id: "",
      checkout_offer_discount: 0,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "OrderDetails");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_order_details_sample.xlsx",
    },
  });
}
