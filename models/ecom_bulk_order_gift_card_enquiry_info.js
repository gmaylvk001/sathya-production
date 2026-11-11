import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },

    product_quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
  },
  { _id: false }
);

const BulkOrderGiftCardEnquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    company_name: {
      type: String,
      required: true,
      trim: true,
    },

    email_address: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },

    mobile_number: {
      type: String,
      required: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please fill a valid 10-digit mobile number",
      ],
    },

    /* address: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: "",
    }, */

    city: {
      type: String,
      required: true,
      trim: true,
    },

    business_type: {
      type: String,
      required: true,
      trim: true,
    },

    requirement_category: {
      type: String,
      required: true,
      trim: true,
    },

    gst_number: {
      type: String,
      trim: true,
      default: "",
    },

    contact_method: {
      type: String,
      required: true,
      trim: true,
    },

    /* state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Please fill a valid 6-digit pincode"],
    }, */

    // Product Array
    product_name_and_quantity: {
      type: [ProductSchema],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one product is required",
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ecom_bulk_order_gift_card_enquiry_info ||
  mongoose.model(
    "ecom_bulk_order_gift_card_enquiry_info",
    BulkOrderGiftCardEnquirySchema
  );