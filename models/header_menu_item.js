import mongoose from "mongoose";

const HeaderMenuItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["category", "custom"], required: true },
    label: { type: String, default: "" },
    category_id: { type: String, default: "" },
    href: { type: String, default: "" },
    position: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  {
    timestamps: true,
    collection: "header_menu_items",
  }
);

HeaderMenuItemSchema.index({ status: 1, position: 1 });
HeaderMenuItemSchema.index(
  { category_id: 1 },
  { unique: true, partialFilterExpression: { type: "category" } }
);

export default mongoose.models.header_menu_items ||
  mongoose.model("header_menu_items", HeaderMenuItemSchema);
