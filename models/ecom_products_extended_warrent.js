import mongoose from "mongoose";

const ExtendedWarrantySchema = new mongoose.Schema(
  {
    item_code: {
      type: String,
      required: true,
      index: true,
    },
    extend_warranty: [
    {
      year: {
        type: Number,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    }
  ],
    status: {
      type: String,
      default: "Active",
    }
  },
  {
    timestamps: {
      createdAt: "created_date",
      updatedAt: "modified_date",
    },
  }
);

export default mongoose.models.ecom_products_extended_warrent ||
  mongoose.model("ecom_products_extended_warrent", ExtendedWarrantySchema);