import mongoose from "mongoose";

const flag = { type: Number, enum: [0, 1], required: false, default: 0 };

const StoreOwnersSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 255 },
  store_name: { type: String, required: true, trim: true, maxlength: 255 },
  email: { type: String, required: false, trim: true, lowercase: true, maxlength: 255, default: "" },
  payment_gateway: { type: String, required: false, trim: true, maxlength: 100, default: "" },
  state_name: { type: String, required: false, trim: true, maxlength: 100, default: "" },
  is_active: { ...flag, default: 1 },
  price_on: flag,
  stock_on: flag,
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "store_owners",
  strict: true,
});

StoreOwnersSchema.index({ store_name: 1 }, { unique: true, name: "store_name_unique" });
StoreOwnersSchema.index({ email: 1 }, { name: "email_idx" });

if (mongoose.models.store_owners) {
  delete mongoose.models.store_owners;
}

export default mongoose.model("store_owners", StoreOwnersSchema);
