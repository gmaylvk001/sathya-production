import mongoose from "mongoose";

const OfferModuleSchema = new mongoose.Schema(
  {
    offerName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

if (mongoose.models.OfferModule) {
  delete mongoose.models.OfferModule;
}

export default mongoose.model("OfferModule", OfferModuleSchema);
