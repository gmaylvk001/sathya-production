import mongoose from "mongoose";

const HelpCallbackSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    topic: {
      type: String,
      enum: [
        "Order & Delivery",
        "Product & Offers",
        "Return / Refund",
        "Installation & Warranty",
        "Other",
      ],
      default: "Order & Delivery",
    },
    timeSlot: {
      type: String,
      enum: [
        "ASAP (Within 30 mins)",
        "Morning (9:30 AM – 1 PM)",
        "Afternoon (1 PM – 5 PM)",
        "Evening (5 PM – 9:30 PM)",
      ],
      default: "ASAP (Within 30 mins)",
    },
    orderId: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.HelpCallback ||
  mongoose.model("HelpCallback", HelpCallbackSchema);
