import mongoose from "mongoose";

const ExchangeOfferConditionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    categoryName: { type: String, required: true },
    brand: { type: String, required: true },
    type: { type: String, required: true },
    condition: { type: String, required: true },
    zone: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

if (mongoose.models.ExchangeOfferCondition) {
  delete mongoose.models.ExchangeOfferCondition;
}

export default mongoose.model("ExchangeOfferCondition", ExchangeOfferConditionSchema);
