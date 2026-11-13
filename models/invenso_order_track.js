import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };

/**
 * Saved Invenzo order-track webhook body.
 * Collection: invenso_order_track
 */
const InvensoOrderTrackSchema = new mongoose.Schema(
  {
    order_number: optionalString,
    file_name: optionalString,
    payload: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "invenso_order_track",
    strict: true,
  }
);

InvensoOrderTrackSchema.index({ order_number: 1 }, { name: "order_number_relation" });
InvensoOrderTrackSchema.index({ created_at: -1 }, { name: "created_at_desc" });

if (mongoose.models.invenso_order_track) {
  delete mongoose.models.invenso_order_track;
}

export default mongoose.model("invenso_order_track", InvensoOrderTrackSchema);
