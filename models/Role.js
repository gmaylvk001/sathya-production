import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
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
  description: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ecom_permissions_info",
  }],
}, { timestamps: true });

export default mongoose.models.ecom_roles_info || mongoose.model("ecom_roles_info", RoleSchema);
