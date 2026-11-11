import mongoose from "mongoose";

const HighlightedProductOfferSchema = new mongoose.Schema(
  {
    offerName: { type: String, required: true },
    products: { type: [String], default: [] }, // Array of Product identifiers (e.g. ObjectIds or names/slugs)
    startDate: { type: String, required: true }, // Simple YYYY-MM-DD or DD-MM-YYYY string based on form
    endDate: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    state: { type: String, required: true },
  },
  { timestamps: true }
);

const HighlightedProductOffer =
  mongoose.models.HighlightedProductOffer ||
  mongoose.model("HighlightedProductOffer", HighlightedProductOfferSchema);

export default HighlightedProductOffer;
