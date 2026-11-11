import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  module: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
  description: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
  status: {
    type: String,
    required: false,
    enum: ["Active", "Inactive"],
  },
}, { timestamps: true });

export default mongoose.models.ecom_permissions_info || mongoose.model("ecom_permissions_info", PermissionSchema);
