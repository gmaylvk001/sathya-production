import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

/**
 * Imported Exist MySQL payment_refund rows.
 * Sheet `id` is stored as `exist_id`. Collection is separate from live `payment_refund`.
 */
const ExistPaymentRefundSchema = new mongoose.Schema(
  {
    exist_id: optionalString,
    user_id: optionalString,
    order_number: optionalString,
    refund_id: optionalString,
    refund_amount: optionalString,
    actual_paid_amount: optionalString,
    payment_id: optionalString,
    error_msg: { type: String, required: false, default: null },
    created_at: optionalDate,
    updated_at: optionalDate,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "exist_payment_refund",
    strict: true,
  }
);

ExistPaymentRefundSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);
ExistPaymentRefundSchema.index({ order_number: 1 }, { name: "order_number_relation" });
ExistPaymentRefundSchema.index({ payment_id: 1 }, { name: "payment_id_relation" });
ExistPaymentRefundSchema.index(
  { refund_id: 1 },
  {
    unique: true,
    partialFilterExpression: { refund_id: { $type: "string", $gt: "" } },
    name: "refund_id_unique_nonempty",
  }
);

if (mongoose.models.exist_payment_refund) {
  delete mongoose.models.exist_payment_refund;
}

export default mongoose.model("exist_payment_refund", ExistPaymentRefundSchema);
