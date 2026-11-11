import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalDate = { type: Date, required: false, default: null };

/**
 * Matches Exist MySQL `order_etc_details_invenzo` columns:
 * id, user_id, order_id, order_number, store_code, order_delivery_id,
 * order_billingaddress, weight_in_grams, length_in_cm, height_in_cm, width_in_cm,
 * volumetric_weight, distance_in_km, promo_code, additional_info, status,
 * created_at, updated_at
 * (Mongo `_id` replaces MySQL `id`)
 */
const OrderEtcDetailsInvenzoSchema = new mongoose.Schema(
  {
    user_id: optionalString,
    /** Exist: varchar(50), unique */
    order_id: optionalString,
    order_number: optionalString,
    store_code: optionalString,
    order_delivery_id: optionalString,
    order_billingaddress: optionalString,
    weight_in_grams: optionalNumber,
    length_in_cm: optionalNumber,
    height_in_cm: optionalNumber,
    width_in_cm: optionalNumber,
    volumetric_weight: optionalNumber,
    distance_in_km: optionalNumber,
    promo_code: optionalString,
    additional_info: { type: String, required: false, default: null },
    status: {
      type: String,
      required: false,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      trim: true,
    },
    created_at: optionalDate,
    updated_at: optionalDate,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "order_etc_details_invenzo",
    strict: true,
  }
);

OrderEtcDetailsInvenzoSchema.index({ order_number: 1 }, { name: "order_number_relation" });
OrderEtcDetailsInvenzoSchema.index(
  { order_id: 1 },
  {
    unique: true,
    partialFilterExpression: { order_id: { $type: "string", $gt: "" } },
    name: "order_id_unique_nonempty",
  }
);

if (mongoose.models.order_etc_details_invenzo) {
  delete mongoose.models.order_etc_details_invenzo;
}

export default mongoose.model(
  "order_etc_details_invenzo",
  OrderEtcDetailsInvenzoSchema
);
