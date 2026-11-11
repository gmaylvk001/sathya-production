import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };

const ExistSathyaOrderDetailSchema = new mongoose.Schema({
  exist_id: optionalString,
  item_code: optionalString,
  product_id: optionalString,
  product_name: optionalString,
  product_price: optionalString,
  model: optionalString,
  user_id: optionalString,
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
  quantity: optionalNumber,
  store_id: optionalString,
  orderNumber: optionalString,
  coupon_discount: optionalNumber,
  is_gift: optionalNumber,
  gift_Price_to_apply: optionalNumber,
  is_combo: optionalNumber,
  warranty_product_code: optionalString,
  is_warranty: optionalNumber,
  is_view: optionalNumber,
  type: optionalString,
  is_exchange_offer: optionalNumber,
  eo_amount: optionalNumber,
  exchange_off_type: optionalString,
  exchange_off_brand: optionalString,
  exchange_off_cond: optionalString,
  exchange_off_pin: optionalNumber,
  exchange_off_amount: optionalNumber,
  special_offer_id: optionalNumber,
  special_discount_id: optionalNumber,
  special_discount_type: optionalString,
  special_offer_discount: optionalNumber,
  is_special_offer: optionalNumber,
  is_checkout_offer: optionalNumber,
  checkout_offer_type: optionalString,
  checkout_offer_id: optionalNumber,
  checkout_offer_discount: optionalNumber,
}, {
  timestamps: false,
  strict: true,
});

ExistSathyaOrderDetailSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

if (mongoose.models.ecom_exist_sathya_order_details) {
  delete mongoose.models.ecom_exist_sathya_order_details;
}

const ExistSathyaOrderDetail = mongoose.model(
  "ecom_exist_sathya_order_details",
  ExistSathyaOrderDetailSchema
);

export const EXIST_SATHYA_ORDER_DETAIL_FIELDS = [
  "exist_id",
  "item_code",
  "product_id",
  "product_name",
  "product_price",
  "model",
  "user_id",
  "created_at",
  "updated_at",
  "quantity",
  "store_id",
  "orderNumber",
  "coupon_discount",
  "is_gift",
  "gift_Price_to_apply",
  "is_combo",
  "warranty_product_code",
  "is_warranty",
  "is_view",
  "type",
  "is_exchange_offer",
  "eo_amount",
  "exchange_off_type",
  "exchange_off_brand",
  "exchange_off_cond",
  "exchange_off_pin",
  "exchange_off_amount",
  "special_offer_id",
  "special_discount_id",
  "special_discount_type",
  "special_offer_discount",
  "is_special_offer",
  "is_checkout_offer",
  "checkout_offer_type",
  "checkout_offer_id",
  "checkout_offer_discount",
];

export const EXIST_SATHYA_ORDER_DETAIL_NUMBER_FIELDS = new Set([
  "quantity",
  "coupon_discount",
  "is_gift",
  "gift_Price_to_apply",
  "is_combo",
  "is_warranty",
  "is_view",
  "is_exchange_offer",
  "eo_amount",
  "exchange_off_pin",
  "exchange_off_amount",
  "special_offer_id",
  "special_discount_id",
  "special_offer_discount",
  "is_special_offer",
  "is_checkout_offer",
  "checkout_offer_id",
  "checkout_offer_discount",
]);

export default ExistSathyaOrderDetail;
