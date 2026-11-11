import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

const OrderHistoryNewSchema = new mongoose.Schema({
  exist_id: optionalString,
  order_id: optionalString,
  order_number: optionalString,
  order_status: optionalString,
  notify: { type: Number, required: false, default: 0 },
  comment: optionalString,
  created_at: optionalDate,
  updated_at: optionalDate,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "order_history_new",
  strict: true,
});

OrderHistoryNewSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

OrderHistoryNewSchema.index(
  { order_id: 1 },
  { name: "order_id_relation" }
);

OrderHistoryNewSchema.index(
  { order_number: 1 },
  { name: "order_number_relation" }
);

if (mongoose.models.order_history_new) {
  delete mongoose.models.order_history_new;
}

export default mongoose.model("order_history_new", OrderHistoryNewSchema);
