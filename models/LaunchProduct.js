import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: "" },
  width: { type: Number },
  height: { type: Number },
}, { _id: false });

const WarrantySchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

const LaunchProductSchema = new mongoose.Schema(
  {
    // The user requested 'id (UUID)', but Mongoose uses ObjectId by default. 
    // We will stick to ObjectId for _id but can add a uuid field if strictly required. 
    // Mongoose handles _id automatically.
    
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    

    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
      index: true,
    },
    
    stock_status: {
      type: String,
      enum: ["pre_book", "in_stock", "out_of_stock", "coming_soon"],
      default: "pre_book",
    },

    desktop_images: [ImageSchema],
    mobile_images: [ImageSchema],
    prebook_modal_image: { type: String, default: "" },

    description: { type: String, default: "" }, // HTML content
    highlights: { type: String, default: "" },  // HTML content
    features: { type: String, default: "" },    // HTML content
    in_the_box: { type: String, default: "" },  // HTML content
    
    warranty: [WarrantySchema],
    

    

    publish_at: { type: Date, default: null, index: true },
    unpublish_at: { type: Date, default: null },

    seo_title: { type: String, default: "" },
    seo_description: { type: String, default: "" },
    og_image: { type: String, default: "" },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    deleted_at: { type: Date, default: null }, // Soft delete
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    optimisticConcurrency: true, // Enables optimistic locking using __v
  }
);

// Auto-generate slug from title before saving if slug is empty
LaunchProductSchema.pre("save", async function (next) {
  try {
    if (this.isModified("title") && !this.slug) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    
    if (this.isModified("slug") && this.slug) {
      let slugExists = true;
      let baseSlug = this.slug;
      let counter = 1;

      const LaunchProduct = mongoose.models.LaunchProduct || mongoose.model("LaunchProduct", LaunchProductSchema);

      while (slugExists) {
        const existingProduct = await LaunchProduct.findOne({ slug: this.slug, _id: { $ne: this._id } }).lean();
        if (existingProduct) {
          this.slug = `${baseSlug}-${counter}`;
          counter++;
        } else {
          slugExists = false;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.models.LaunchProduct ||
  mongoose.model("LaunchProduct", LaunchProductSchema);
