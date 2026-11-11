import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  modevalue : { type: String},
  payment_Date: { type: String},
  payment_id : { type: String, unique: true, required: true },
  status: { type: String },
  payment_mode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_payment_infos || mongoose.model("ecom_payment_infos", PaymentSchema);
