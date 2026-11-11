import * as yup from "yup";

const imageSchema = yup.object().shape({
  url: yup.string().url("Must be a valid URL").required("Image URL is required"),
  alt: yup.string().default(""),
  width: yup.number().positive().integer().nullable(),
  height: yup.number().positive().integer().nullable(),
});

const warrantySchema = yup.object().shape({
  label: yup.string().required("Warranty label is required"),
  value: yup.string().required("Warranty value is required"),
});

export const launchProductSchema = yup.object().shape({
  title: yup.string().required("Title is required").max(150, "Title is too long"),
  slug: yup.string().nullable().max(150, "Slug is too long").matches(/^[a-z0-9-]+$/, { excludeEmptyString: true, message: "Slug must contain only lowercase letters, numbers, and hyphens" }),
  design_type: yup.string().oneOf(["old", "new_iplanet"]).default("old"),
  status: yup.string().oneOf(["draft", "scheduled", "published", "archived"]).default("draft"),
  stock_status: yup.string().oneOf(["pre_book", "in_stock", "out_of_stock", "coming_soon"]).default("pre_book"),
  
  desktop_images: yup.array().of(imageSchema).default([]),
  mobile_images: yup.array().of(imageSchema).default([]),
  prebook_modal_image: yup.string().url("Must be a valid URL").nullable().default(""),
  
  description: yup.string().default(""),
  highlights: yup.string().default(""),
  features: yup.string().default(""),
  in_the_box: yup.string().default(""),
  
  warranty: yup.array().of(warrantySchema).default([]),
  
  linked_product_ids: yup.array().of(yup.string()).default([]),
  
  emi_starting_price: yup.number().positive("EMI must be positive").nullable().default(null),
  
  publish_at: yup.date().nullable().default(null),
  unpublish_at: yup.date().nullable().default(null).min(yup.ref('publish_at'), "Unpublish date must be after publish date"),
  
  seo_title: yup.string().max(60, "SEO title should be under 60 characters").default(""),
  seo_description: yup.string().max(160, "SEO description should be under 160 characters").default(""),
  og_image: yup.string().url("Must be a valid URL").nullable().default(""),
  
  version: yup.number().integer().min(0).default(0), // used for optimistic locking when updating
});
