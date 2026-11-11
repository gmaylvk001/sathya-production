import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String,
  md5_name : String,
  slug: String,
  item_code: String,
  brand_code: String,
  price: Number,
  special_price: Number,
  quantity: Number,
  description: String,
  category: String,
  sub_category: String,
  brand: String,
  size: { type: String, default: "" },
  star: { type: String, default: "" },
  category: String,
  movement: String,
  model_number: String,
  ean: { type: String, default: "" },
   sathya_old_id: { type: String, default: "", index: true },
  common_item_code: { type: String, default: "" },
  outdoor_item_code: { type: String, default: "" },
  indoor_ean: { type: String, default: "" },
  outdoor_ean: { type: String, default: "" },
  key_specifications : { type: [String], default: [] },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  stock_status: { type: String, enum: ["In Stock", "Out of Stock"], default: "In Stock" },
  hasVariants: { type: Boolean, default: false },
  variants: { type: Object, default: {} },
  variantGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VariantGroup",
    default: null,
    index: true,
  },
  images: { type: [String], default: [] }, 
  filter : { type: Object, default: {} },
  overview_image: { type: [String], default: [] }, 
  featured_products :{ type: Object, default: {} },
  related_products: { 
  type: [mongoose.Schema.Types.ObjectId], 
  ref: "Product", 
  default: [] 
},
add_ons: {
  type: [mongoose.Schema.Types.ObjectId],
  ref: "Product",
  default: [],
},

warranty_ids: {
  type: [String],
  default: [],
},
  warranty: Number,
  extended_warranty:Number,
  extend_warranty: {
    type: [
      {
        year: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    default: [],
  },
  overviewdescription: String,
  product_highlights: {type: [String],default: [],},
  meta_title: { type: String, default: "" }, // Add meta_title field
  meta_description: { type: String, default: "" }, 
  category_new: { type: String, default: "" },
  sub_category_new: { type: String, default: "" },
  search_keywords: { type: String, default: "" },
  sub_category_new_name: { type: String, default: "" },
  is_common_type: { type: Number, default: 0 },
  final_price: { type: Number, default: null },
  od_final_price: { type: Number, default: null },
  id_final_price: { type: Number, default: null },
  lsp: { type: Number, default: 0 },
  lsp_competitor: { type: String, default: "" },
  id_lspfinal_price: { type: Number, default: null },
  od_lspfinal_price: { type: Number, default: null },
  lsp_updated_at: { type: Date, default: null },
  /** Exist products.chk_display_store_stock — 1 = run WH/showroom display_stock check on PDP */
  chk_display_store_stock: { type: Number, default: 0 },
  productMailsending: { type: Boolean, default: false },
  mailSendingStartedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProductSchema.index({ createdAt: -1, _id: -1 });
ProductSchema.index({ status: 1, brand: 1 });
ProductSchema.index({ status: 1, name: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, sub_category_new_name: 1 });
ProductSchema.index({ status: 1, item_code: 1 });
ProductSchema.index({ item_code: 1 });
ProductSchema.index({ common_item_code: 1 });
ProductSchema.index({ outdoor_item_code: 1 });
ProductSchema.index({ ean: 1 });
ProductSchema.index({ indoor_ean: 1 });
ProductSchema.index({ outdoor_ean: 1 });
ProductSchema.index({ status: 1, model_number: 1 });
ProductSchema.index(
  {
    name: "text",
    sub_category_new_name: "text",
    item_code: "text",
    model_number: "text",
    search_keywords: "text",
  },
  {
    weights: {
      name: 10,
      model_number: 8,
      item_code: 8,
      sub_category_new_name: 5,
      search_keywords: 3,
    },
    name: "product_search_text_idx",
    background: true,
  }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
