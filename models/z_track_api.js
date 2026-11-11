import mongoose from "mongoose";

const ZTrackApiSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, maxlength: 32, default: null },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now },
  },
  {
    collection: "z_track_api",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: true,
  }
);

if (mongoose.models.z_track_api) {
  delete mongoose.models.z_track_api;
}

export default mongoose.model("z_track_api", ZTrackApiSchema);
