import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalDate = { type: Date, required: false, default: null };

const OrderDetailsNewSchema = new mongoose.Schema({
  exist_id: optionalString,
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders_new",
    required: false,
    default: null,
  },
  item_code: optionalString,
  product_id: optionalString,
  product_name: optionalString,
  product_price: optionalString,
  model: optionalString,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ecom_users_info",
    required: false,
    default: null,
  },
  created_at: optionalDate,
  updated_at: optionalDate,
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
  type: { type: String, required: false, default: "online", trim: true },
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
  image: optionalString,
  discount: optionalNumber,
  warrantyData: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  extendedWarranty: optionalNumber,
  variantValues: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  selectedVariant: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  color: optionalString,
  attributes: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  coupondetails: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "order_details_new",
  strict: true,
});

OrderDetailsNewSchema.index(
  { exist_id: 1 },
  { name: "exist_id_exist_user_map" }
);

OrderDetailsNewSchema.index(
  { order_id: 1 },
  { name: "order_id_relation" }
);

OrderDetailsNewSchema.index(
  { user_id: 1 },
  { name: "user_id_relation" }
);

OrderDetailsNewSchema.index(
  { orderNumber: 1 },
  { name: "orderNumber_relation" }
);

if (mongoose.models.order_details_new) {
  delete mongoose.models.order_details_new;
}

export default mongoose.model("order_details_new", OrderDetailsNewSchema);
