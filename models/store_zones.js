import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };

const StoreZonesSchema = new mongoose.Schema({
  exist_id: optionalString,
  zonename: { type: String, required: false, default: null, trim: true, maxlength: 45 },
  slug: { type: String, required: true, trim: true, maxlength: 60 },
  status: { type: Number, required: true, default: 0 },
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "store_zones",
  strict: true,
});

StoreZonesSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);
StoreZonesSchema.index({ slug: 1 }, { name: "slug_idx" });

if (mongoose.models.store_zones) {
  delete mongoose.models.store_zones;
}

export const STORE_ZONE_FIELDS = ["exist_id", "zonename", "slug", "status", "created_at", "updated_at"];
export const STORE_ZONE_NUMBER_FIELDS = new Set(["status"]);

export default mongoose.model("store_zones", StoreZonesSchema);
