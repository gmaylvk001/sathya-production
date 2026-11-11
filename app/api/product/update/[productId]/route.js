// ...
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import connectDB from "@/lib/db";
import Product from "@/models/product";
import Product_filter from "@/models/ecom_productfilter_info";
import md5 from "md5";
import Category from "@/models/ecom_category_info";


async function buildCategoryChain(categoryId) {
  let md5_chain = [];
  let name_chain = [];
  let id_chain = [];

  let current = await Category.findById(categoryId);
  if (!current) {
    return {
      md5_chain: "",
      name_chain: "",
      id_chain: "",
      root_chain: "",
      root_md5: "",
      root_id: "",
      root_id_chain: ""
    };
  }

  // Add current category
  md5_chain.push(current.md5_cat_name);
  name_chain.push(current.category_name);
  id_chain.push(current._id.toString());

  // Loop until root
  while (current.parentid && current.parentid !== "none") {
    const parent = await Category.findById(current.parentid);
    if (!parent) break;

    md5_chain.push(parent.md5_cat_name);
    name_chain.push(parent.category_name);
    id_chain.push(parent._id.toString());

    current = parent;
  }

  // Reverse for root → child
  md5_chain.reverse();
  name_chain.reverse();
  id_chain.reverse();

  const root_chain = name_chain[0] || "";
  const root_md5 = md5_chain[0] || "";
  const root_id = id_chain[0] || "";

  return {
    md5_chain: md5_chain.join("##"),
    name_chain: name_chain.join("##"),
    id_chain: id_chain.join("##"),
    root_chain,
    root_md5,
    root_id
  };
}

export async function PUT(req, { params }) {
  try {
    const { productId } = params; 
    const formData = await req.formData();
    const productData = JSON.parse(formData.get("product"));
    const imageFiles = formData.getAll("images");
    const overviewImageFiles = formData.getAll("overviewImages");
    const category = formData.get("category");
    const highlights = JSON.parse(formData.get("highlights") || "[]");
    let variants = JSON.parse(formData.get("variant") || "[]");
    const Filters    = productData.filters;


console.log(productData);
console.log("..............................................................");

    const slug = productData.slug;
    const md5_cat_name = md5(slug);

    await connectDB();
// ✅ Duplicate check for item_code
if (productData.item_code) {
  const existingProduct = await Product.findOne({
    item_code: productData.item_code,
    _id: { $ne: productId } // exclude current product
  });

  if (existingProduct) {
    return NextResponse.json(
      { error: "Product with this item code already exists" },
      { status: 400 }
    );
  }
}

// ✅ Duplicate check for slug (product name)
if (productData.slug) {
  const existingProductname = await Product.findOne({
    slug: productData.slug,
    _id: { $ne: productId } // exclude current product
  });

  if (existingProductname) {
    return NextResponse.json(
      { error: "Product name (slug) already exists" },
      { status: 400 }
    );
  }
}

 // ✅ Duplicate check for model_number (if you want it to be unique)
    /* if (productData.model_number) {
      const existingModel = await Product.findOne({
        model_number: productData.model_number,
        _id: { $ne: productId } // exclude current product
      });

      if (existingModel) {
        return NextResponse.json(
          { error: "Product with this model number already exists" },
          { status: 400 }
        );
      }
    } */

 // ✅ Get extend_warranty from productData instead of separate formData
    const extend_warranty = (productData.extend_warranty || []).map(item => ({
      year: Number(item.year) || 0,
      amount: Number(item.amount) || 0,
    }));

    console.log("Processed extend_warranty:", extend_warranty);
console.log(imageFiles);
// Updated pathing for more reliability
    // ...
// Inside your PUT handler
// ...
let savedImages = [];
const uploadDir = path.join(path.resolve(), "public", "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  await fs.promises.mkdir(uploadDir, { recursive: true });
}

for (const file of imageFiles) {
  if (!file || typeof file.name !== "string") continue;
  
  // Use the filename provided by the client, which is already unique
  const filename = file.name.replace(/\s+/g, "-");
  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  
  try {
    await writeFile(filePath, buffer);
    savedImages.push(filename); // Save the clean filename to the database
  } catch (error) {
    console.error("Error writing file to disk:", error);
  }
}

// And the same change for overview images and variant images

// ...
    const savedOverviewImages = [];
for (const file of overviewImageFiles) {
  if (!file || typeof file.name !== "string") continue;
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  savedOverviewImages.push(filename);
}

// / Get existing overview images from productData
const existingOverviewImages = Array.isArray(productData.overview_image) 
  ? productData.overview_image.filter(img => typeof img === "string" && !img.startsWith("blob:"))
  : [];

  // Combine existing overview images with newly uploaded ones
const finalOverviewImages = [
  ...existingOverviewImages,
  ...savedOverviewImages
];

    if (productData.hasVariants) {
      for (let i = 0; i < variants.length; i++) {
        const variantImages = [];
        let imgIndex = 0;

        while (true) {
          const imageKey = `variant_${i}_image_${imgIndex}`;
          const imageFile = formData.get(imageKey);
          if (!imageFile || typeof imageFile.name !== "string") break;

          const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, "-")}`;
          const filePath = path.join(uploadDir, filename);
          const buffer = Buffer.from(await imageFile.arrayBuffer());
          await writeFile(filePath, buffer);

          variantImages.push(imageFile.name.replace(/\s+/g, "-")); // Correct: Save only the original name
          imgIndex++;
        }

        variants[i].images = variantImages;
      }
    } else {
      variants = [];
    }

    productData.product_highlights = highlights;
    productData.variants = variants;
    productData.md5_name = md5_cat_name;

productData.extend_warranty = extend_warranty;

    if (productData.quantity <= 0) {
      productData.stock_status = "Out of Stock";
    }

   let finalImages = [
  ...(productData.images || []), // old images coming from frontend
  ...(savedImages || [])         // newly uploaded files
];




// Normalize filters to just ObjectId strings
const filterIds = (productData.filters ?? []).map(f =>
  typeof f === "object" ? f.value : f
).filter(Boolean);

// Normalize/trim brand_code; omit if empty to avoid overwriting with empty string
const normalizedBrandCode = typeof productData.brand_code === "string" ? productData.brand_code.trim() : undefined;
if (normalizedBrandCode) {
  productData.brand_code = normalizedBrandCode;
} else {
  delete productData.brand_code;
}


const chain = await buildCategoryChain(productData.sub_category);



console.log("Normalized brand_code:", productData);

const updatePayload = {
    ...productData,
    // Ensure new fields are properly set
      model_number: productData.model_number || "",
      movement: productData.movement || "",
      size: productData.size || "",
      chk_display_store_stock:
        Number(productData.chk_display_store_stock) === 1 ? 1 : 0,
    //  category: chain.root_id, Parent category
  sub_category: productData.sub_category, // Subcategory
  category_new: chain.root_md5,
  sub_category_new: chain.md5_chain,
  sub_category_new_name: chain.name_chain,
    images: finalImages,
    add_ons:productData.add_ons,
    category: productData.category,
    // overview_image: savedOverviewImages.length > 0 
    //   ? savedOverviewImages 
    //   : productData.overview_image,
    overview_image: finalOverviewImages.length > 0 ? finalOverviewImages : [],
    filters: filterIds,  // ✅ Save filters directly to product
    extend_warranty: extend_warranty,
};

// Mail-sending flag is controlled by wishlist add / cron only
delete updatePayload.productMailsending;
delete updatePayload.mailSendingStartedAt;

const updatedProduct = await Product.findByIdAndUpdate(
  productId,
  updatePayload,
  { new: true }
); 

console.log("Updated product extend_warranty:", updatedProduct?.extend_warranty);
// Filters = array of strings
console.log(Filters);
const product_id = updatedProduct?._id;
if (product_id){

  if (filterIds.length != 0) {

    await Product_filter.deleteMany({
      product_id,
      filter_id: { $nin: filterIds },
    });

    const bulkOps = filterIds.map(filter_id => ({
      updateOne: {
        filter: { product_id, filter_id },
        update: { $setOnInsert: { product_id, filter_id } },
        upsert: true,
      },
    }));

// In your product update API endpoint
if (productData.removedOverviewImages && productData.removedOverviewImages.length > 0) {
  // Remove the deleted images from the overview_image array
  productData.overview_image = productData.overview_image.filter(
    img => !productData.removedOverviewImages.includes(img)
  );
  
  // Also delete the actual image files from server
  productData.removedOverviewImages.forEach(imagePath => {
    if (imagePath && typeof imagePath === 'string') {
      const fullPath = path.join(process.cwd(), 'public', 'uploads', 'products', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted overview image:', imagePath);
      }
    }
  });
}

// Handle new overview image uploads
if (req.files && req.files.overviewImages) {
  const overviewImageFiles = Array.isArray(req.files.overviewImages) 
    ? req.files.overviewImages 
    : [req.files.overviewImages];
  
  const overviewImagePaths = overviewImageFiles.map(file => file.filename);
  
  // Add new images to the existing overview_image array
  productData.overview_image = [...productData.overview_image, ...overviewImagePaths];
}

    await Product_filter.bulkWrite(bulkOps);

  }else{
  await Product_filter.deleteMany({ product_id });
  }
}

    if (!updatedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    updatedProduct.removalReason = "Outdated";
    updatedProduct.add_ons = productData.add_ons;
    updatedProduct.category = productData.category;


    return NextResponse.json(
      { message: "Product updated successfully", product: updatedProduct, extend_warranty: updatedProduct.extend_warranty },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}