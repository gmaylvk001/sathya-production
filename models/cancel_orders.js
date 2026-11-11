import mongoose from "mongoose";

const CancelOrdersSchema = new mongoose.Schema({
  // Exist cancel_orders.id (set by admin import only)
  exist_id: { type: String, required: false, trim: true, default: undefined },
  order_number: { type: String, required: true, trim: true, maxlength: 45 },
  order_id: { type: String, required: true, trim: true, maxlength: 45 },
  customer_id: { type: String, required: true, trim: true, maxlength: 45 },
  order_status: { type: String, required: true, trim: true, maxlength: 255 },
  // My Orders: dropdown value; Admin exist: may be empty
  reason: { type: String, required: false, trim: true, maxlength: 255, default: "" },
  comments: { type: String, required: false, default: null },
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "cancel_orders",
  strict: true,
});

CancelOrdersSchema.index({ order_number: 1 }, { name: "order_number_idx" });
CancelOrdersSchema.index({ order_id: 1 }, { name: "order_id_idx" });
CancelOrdersSchema.index({ customer_id: 1 }, { name: "customer_id_idx" });
CancelOrdersSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

if (mongoose.models.cancel_orders) {
  delete mongoose.models.cancel_orders;
}

export default mongoose.model("cancel_orders", CancelOrdersSchema);
