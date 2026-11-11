import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalDate = { type: Date, required: false, default: null };

const CouponNewSchema = new mongoose.Schema({
  exist_id: optionalString,
  create_coupon_type: optionalString,
  create_coupon_count: optionalNumber,
  create_coupon_prefix: optionalString,
  name: optionalString,
  code: optionalString,
  code_for: optionalString,
  type: optionalString,
  item_code: optionalString,
  discount: optionalNumber,
  shipping: { type: Number, required: false, default: 0 },
  date_start: optionalDate,
  date_end: optionalDate,
  status: { type: Number, required: false, default: 0 },
  uses_total: optionalNumber,
  uses_customer: optionalNumber,
  cart_value: optionalNumber,
  created_at: optionalDate,
  updated_at: optionalDate,
  is_display_frontend: optionalNumber,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "coupon_new",
  strict: true,
});

CouponNewSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

CouponNewSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $type: "string" } },
    name: "code_unique_nonempty",
  }
);

if (mongoose.models.coupon_new) {
  delete mongoose.models.coupon_new;
}

export default mongoose.model("coupon_new", CouponNewSchema);
