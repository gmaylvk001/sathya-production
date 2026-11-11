import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalMixed = { type: mongoose.Schema.Types.Mixed, required: false, default: null };

const ExistSathyaOrderSchema = new mongoose.Schema({
  exist_id: optionalString,
  user_id: optionalString,
  cart_id: optionalString,
  sales_person_id: optionalString,
  sales_person_role: optionalString,
  user_adddeliveryid: optionalString,
  order_username: optionalString,
  order_phonenumber: optionalString,
  order_item: optionalString,
  order_amount: optionalString,
  order_deliveryaddress: optionalString,
  order_billingaddress: optionalString,
  payment_method: optionalString,
  payment_type: optionalString,
  order_status: optionalString,
  delivery_type: optionalString,
  type: optionalString,
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
  user_addbillingid: optionalString,
  payment_id: optionalString,
  order_number: optionalString,
  api_status: optionalString,
  pickup_type: optionalString,
  api_reason: optionalString,
  file_path: optionalString,
  invoice: optionalString,
  is_tac: optionalString,
  archive: optionalString,
  referrel_url: optionalString,
  utm_source: optionalString,
  utm_campaign: optionalString,
  coupon_discount: optionalString,
  eo_discount: optionalString,
  coupon_id: optionalString,
  offline_order_date: { type: Date, required: false, default: null },
  emi_txn_ref_no: optionalString,
  rcu_status: optionalString,
  asset_status: optionalString,
  do_generation_status: optionalString,
  doc_status: optionalString,
  qc_status: optionalString,
  bajajbilling: optionalString,
  schema_request: optionalMixed,
  bajaj_do_checkout: optionalMixed,
  netamt: optionalString,
  online_pay_refid: optionalString,
  online_pay_ref_status: optionalString,
  order_owner: optionalString,
}, {
  timestamps: false,
  strict: true,
});

ExistSathyaOrderSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

ExistSathyaOrderSchema.index(
  { order_number: 1 },
  {
    unique: true,
    partialFilterExpression: { order_number: { $type: "string" } },
    name: "order_number_unique_nonempty",
  }
);

if (mongoose.models.ecom_exist_sathya_orders) {
  delete mongoose.models.ecom_exist_sathya_orders;
}

const ExistSathyaOrder = mongoose.model("ecom_exist_sathya_orders", ExistSathyaOrderSchema);

export const EXIST_SATHYA_ORDER_FIELDS = [
  "exist_id",
  "user_id",
  "cart_id",
  "sales_person_id",
  "sales_person_role",
  "user_adddeliveryid",
  "order_username",
  "order_phonenumber",
  "order_item",
  "order_amount",
  "order_deliveryaddress",
  "order_billingaddress",
  "payment_method",
  "payment_type",
  "order_status",
  "delivery_type",
  "type",
  "created_at",
  "updated_at",
  "user_addbillingid",
  "payment_id",
  "order_number",
  "api_status",
  "pickup_type",
  "api_reason",
  "file_path",
  "invoice",
  "is_tac",
  "archive",
  "referrel_url",
  "utm_source",
  "utm_campaign",
  "coupon_discount",
  "eo_discount",
  "coupon_id",
  "offline_order_date",
  "emi_txn_ref_no",
  "rcu_status",
  "asset_status",
  "do_generation_status",
  "doc_status",
  "qc_status",
  "bajajbilling",
  "schema_request",
  "bajaj_do_checkout",
  "netamt",
  "online_pay_refid",
  "online_pay_ref_status",
  "order_owner",
];

export default ExistSathyaOrder;
