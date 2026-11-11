import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

/**
 * Exist-style order history comments.
 * Collection: order_history_comments
 * users_id = currently logged-in admin ObjectId (string).
 */
const OrderHistoryCommentsSchema = new mongoose.Schema(
  {
    order_number: { type: String, required: true, trim: true },
    order_status: { type: String, required: true, trim: true },
    users_id: {
      type: String,
      required: true,
      trim: true,
      ref: "ecom_users_info",
    },
    comment: { type: String, required: true, trim: true, maxlength: 255 },
    // Link to the order_history_new row this comment was added on (not in SQL schema; needed for UI)
    order_history_id: optionalString,
    order_id: optionalString,
    created_at: optionalDate,
    updated_at: optionalDate,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "order_history_comments",
    strict: true,
  }
);

OrderHistoryCommentsSchema.index({ order_number: 1 }, { name: "order_number_relation" });
OrderHistoryCommentsSchema.index({ users_id: 1 }, { name: "users_id_relation" });
OrderHistoryCommentsSchema.index({ order_history_id: 1 }, { name: "order_history_id_relation" });

if (mongoose.models.order_history_comments) {
  delete mongoose.models.order_history_comments;
}

export default mongoose.model("order_history_comments", OrderHistoryCommentsSchema);
