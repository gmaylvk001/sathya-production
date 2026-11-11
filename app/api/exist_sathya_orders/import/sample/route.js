import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleRows = [
    {
      id: "13",
      user_id: "1436",
      cart_id: "",
      sales_person_id: "",
      sales_person_role: "",
      user_adddeliveryid: "21",
      order_username: "Kanagaraj R",
      order_phonenumber: "9943879307",
      order_item: "115",
      order_amount: "26990",
      order_deliveryaddress: "8/195,chettisalapalayam,Unjanai Village, Tiru",
      order_billingaddress: "",
      payment_method: "",
      payment_type: "",
      order_status: "Cancelled",
      delivery_type: "home",
      type: "online",
      created_at: "2020-03-24 04:33:48",
      updated_at: "2020-04-24 04:55:16",
      user_addbillingid: "21",
      payment_id: "15",
      order_number: "20200324_OL_4055",
      api_status: "PENDING",
      pickup_type: "",
      api_reason: "",
      file_path: "",
      invoice: "",
      is_tac: "1",
      archive: "0",
      referrel_url: "",
      utm_source: "",
      utm_campaign: "",
      coupon_discount: "",
      eo_discount: "0.0000",
      coupon_id: "",
      offline_order_date: "",
      emi_txn_ref_no: "",
      rcu_status: "0",
      asset_status: "0",
      do_generation_status: "0",
      doc_status: "0",
      qc_status: "0",
      bajajbilling: "0",
      schema_request: "",
      bajaj_do_checkout: "",
      netamt: "",
      online_pay_refid: "",
      online_pay_ref_status: "",
      order_owner: "sathya",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=exist_sathya_orders_sample.xlsx",
    },
  });
}
