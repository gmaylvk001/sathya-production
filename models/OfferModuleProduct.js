import mongoose from "mongoose";

const OfferModuleProductSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "OfferModule", required: true },
    primaryImage: { type: String },
    productSellingType: { type: String, default: "Price" },
    price: { type: Number, default: null },
    specialPrice: { type: Number, default: null },
    emiStartsFrom: { type: Number, default: null },
    categories: { type: String }, // Can be adjusted to Array if needed
    isCombo: { type: String, enum: ["Yes", "No"], default: "No" },
  },
  { timestamps: true }
);

export default mongoose.models.OfferModuleProduct || mongoose.model("OfferModuleProduct", OfferModuleProductSchema);
