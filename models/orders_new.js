import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalDate = { type: Date, required: false, default: null };
const optionalMixed = { type: mongoose.Schema.Types.Mixed, required: false, default: null };

const OrderNewSchema = new mongoose.Schema({
  exist_id: optionalString,
  user_id: optionalString,
  cart_id: optionalString,
  sales_person_id: optionalNumber,
  sales_person_role: optionalNumber,
  user_adddeliveryid: optionalString,
  order_username: optionalString,
  order_phonenumber: optionalString,
  email_address: optionalString,
  order_item: optionalMixed,
  order_amount: optionalString,
  order_deliveryaddress: optionalString,
  order_billingaddress: optionalString,
  customer_comments: optionalString,
  payment_method: optionalString,
  payment_type: optionalString,
  payment_mode: optionalString,
  payment_status: optionalString,
  order_status: {
    type: String,
    required: false,
    enum: [
      "Billed",
      "Cancelled",
      "Complete",
      "failure",
      "Order Accepted",
      "Order Placed",
      "ordered",
      "Payment Initiated",
      "pending",
    ],
    default: "pending",
    trim: true,
  },
  delivery_type: {
    type: String,
    required: false,
    enum: ["store", "home", null],
    default: null,
    trim: true,
  },
  delivery_date: optionalDate,
  pickup_store: optionalString,
  store_id: optionalString,
  region: optionalString,
  gst_number: optionalString,
  type: {
    type: String,
    required: false,
    enum: ["online", "offline"],
    default: "online",
    trim: true,
  },
  created_at: optionalDate,
  updated_at: optionalDate,
  user_addbillingid: optionalString,
  payment_id: optionalString,
  order_number: optionalString,
  api_status: { type: String, required: false, default: "PENDING", trim: true },
  pickup_type: optionalString,
  api_reason: optionalString,
  file_path: optionalString,
  invoice: optionalString,
  is_tac: optionalNumber,
  archive: { type: Number, required: false, default: 0 },
  referrel_url: optionalString,
  utm_source: optionalString,
  utm_campaign: optionalString,
  coupon_discount: optionalNumber,
  eo_discount: optionalNumber,
  coupon_id: optionalString,
  promotion_code_applied: optionalString,
  promotion_discount_applied: { type: Number, required: false, default: 0 },
  loyalty_points_awarded: { type: Number, required: false, default: 0 },
  loyalty_points_redeemed: { type: Number, required: false, default: 0 },
  loyalty_discount: { type: Number, required: false, default: 0 },
  loyalty_redemption_token: optionalString,
  points_per_currency_unit: optionalNumber,
  truco_transaction_id: optionalString,
  offline_order_date: optionalDate,
  emi_txn_ref_no: optionalString,
  rcu_status: { type: Number, required: false, default: 0 },
  asset_status: { type: Number, required: false, default: 0 },
  do_generation_status: { type: Number, required: false, default: 0 },
  doc_status: { type: Number, required: false, default: 0 },
  qc_status: { type: Number, required: false, default: 0 },
  bajajbilling: { type: Number, required: false, default: 0 },
  schema_request: optionalMixed,
  bajaj_do_checkout: optionalString,
  netamt: optionalString,
  online_pay_refid: optionalString,
  online_pay_ref_status: optionalString,
  // Shared across every line order in one checkout (payment totals / verify).
  // Does not change order_number format.
  checkout_group_id: optionalString,
  order_owner: {
    type: String,
    required: false,
    enum: ["unilet", "sathya"],
    default: "sathya",
  },
  applied_payment_offer: optionalMixed,
  appliedPaymentOffer: optionalMixed,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "orders_new",
  strict: true,
});

OrderNewSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

OrderNewSchema.index(
  { order_number: 1 },
  {
    unique: true,
    partialFilterExpression: { order_number: { $type: "string" } },
    name: "order_number_unique_nonempty",
  }
);

OrderNewSchema.index(
  { coupon_id: 1 },
  { name: "coupon_id_relation" }
);

OrderNewSchema.index(
  { payment_id: 1 },
  { name: "payment_id_relation" }
);

OrderNewSchema.index(
  { user_adddeliveryid: 1 },
  { name: "user_adddeliveryid_relation" }
);

OrderNewSchema.index(
  { user_addbillingid: 1 },
  { name: "user_addbillingid_relation" }
);

OrderNewSchema.index(
  { cart_id: 1 },
  { name: "cart_id_relation" }
);

OrderNewSchema.index(
  { checkout_group_id: 1 },
  { name: "checkout_group_id_relation" }
);

OrderNewSchema.index({ user_id: 1, created_at: -1 }, { name: "user_created_at" });
OrderNewSchema.index({ order_owner: 1, created_at: -1 }, { name: "order_owner_created_at" });
OrderNewSchema.index({ store_id: 1, created_at: -1 }, { name: "store_id_created_at" });
OrderNewSchema.index({ pickup_store: 1, created_at: -1 }, { name: "pickup_store_created_at" });

if (mongoose.models.orders_new) {
  delete mongoose.models.orders_new;
}

export default mongoose.model("orders_new", OrderNewSchema);
