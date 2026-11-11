import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

const OrderHistoryNewLiveSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders_new",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ecom_users_info",
    required: false,
    default: null,
  },
  exist_id: optionalString,
  order_number: optionalString,
  order_status: optionalString,
  notify: { type: Number, required: false, default: 0 },
  comment: optionalString,
  created_at: optionalDate,
  updated_at: optionalDate,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "order_history_new_live",
  strict: true,
});

OrderHistoryNewLiveSchema.index(
  { orderId: 1, created_at: -1 },
  { name: "orderId_created_at" }
);

OrderHistoryNewLiveSchema.index(
  { userId: 1 },
  { name: "userId_relation" }
);

OrderHistoryNewLiveSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

OrderHistoryNewLiveSchema.index(
  { order_number: 1 },
  { name: "order_number_relation" }
);

if (mongoose.models.order_history_new_live) {
  delete mongoose.models.order_history_new_live;
}

export default mongoose.model("order_history_new_live", OrderHistoryNewLiveSchema);
