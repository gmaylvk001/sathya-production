import mongoose from "mongoose";

// Live cancel requests (My Orders, admin cancel, and imported rows copied by Fetch).
// Imported exist rows stay in cancel_orders; order_id here is always orders_new._id.
const CancelOrdersLiveSchema = new mongoose.Schema({
  // cancel_orders.exist_id of the imported row this was copied from
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
  collection: "cancel_orders_live",
  strict: true,
});

CancelOrdersLiveSchema.index({ order_number: 1 }, { name: "order_number_idx" });
CancelOrdersLiveSchema.index({ order_id: 1 }, { name: "order_id_idx" });
CancelOrdersLiveSchema.index({ customer_id: 1 }, { name: "customer_id_idx" });
CancelOrdersLiveSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

if (mongoose.models.cancel_orders_live) {
  delete mongoose.models.cancel_orders_live;
}

export default mongoose.model("cancel_orders_live", CancelOrdersLiveSchema);
