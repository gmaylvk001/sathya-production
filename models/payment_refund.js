import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };

/**
 * Matches Exist MySQL `payment_refund` columns:
 * id, user_id, order_number, refund_id, refund_amount, actual_paid_amount,
 * created_at, updated_at, payment_id (NOT NULL), error_msg
 * (Mongo `_id` replaces MySQL `id`)
 */
const PaymentRefundSchema = new mongoose.Schema(
  {
    user_id: optionalString,
    order_number: optionalString,
    refund_id: optionalString,
    /** Exist: varchar(45) */
    refund_amount: optionalString,
    /** Exist: varchar(45) */
    actual_paid_amount: optionalString,
    /** Exist: varchar(255) NOT NULL — payments.id */
    payment_id: { type: String, required: true, trim: true },
    error_msg: { type: String, required: false, default: null },
    created_at: { type: Date, required: false, default: null },
    updated_at: { type: Date, required: false, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "payment_refund",
    strict: true,
  }
);

PaymentRefundSchema.index({ order_number: 1 }, { name: "order_number_relation" });
PaymentRefundSchema.index({ payment_id: 1 }, { name: "payment_id_relation" });
PaymentRefundSchema.index(
  { refund_id: 1 },
  {
    unique: true,
    partialFilterExpression: { refund_id: { $type: "string", $gt: "" } },
    name: "refund_id_unique_nonempty",
  }
);

if (mongoose.models.payment_refund) {
  delete mongoose.models.payment_refund;
}

export default mongoose.model("payment_refund", PaymentRefundSchema);
