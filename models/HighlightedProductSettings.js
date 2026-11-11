import mongoose from "mongoose";

const HighlightedProductSettingsSchema = new mongoose.Schema(
  {
    labelText: { type: String, required: true },
    labelColor: { type: String, required: true },
  },
  { timestamps: true }
);

const HighlightedProductSettings =
  mongoose.models.HighlightedProductSettings ||
  mongoose.model("HighlightedProductSettings", HighlightedProductSettingsSchema);

export default HighlightedProductSettings;
