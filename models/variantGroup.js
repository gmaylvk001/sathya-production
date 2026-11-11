import mongoose from "mongoose";

const ValueMetaSchema = new mongoose.Schema(
  {
    value: { type: String, default: "" },
    image: { type: String, default: "" },
    colorHex: { type: String, default: "" },
  },
  { _id: false }
);

const AttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["text", "color"], default: "text" },
    options: { type: [String], default: [] },
    valuesMeta: { type: [ValueMetaSchema], default: [] },
  },
  { _id: false }
);

const GroupProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    values: { type: Object, default: {} },
  },
  { _id: false }
);

const VariantGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    group_code: { type: String, default: "", trim: true, index: true },
    attributes: { type: [AttributeSchema], default: [] },
    products: { type: [GroupProductSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.VariantGroup ||
  mongoose.model("VariantGroup", VariantGroupSchema);
