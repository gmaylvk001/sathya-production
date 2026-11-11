import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import connectDB from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import Product_filter from "@/models/ecom_productfilter_info";
import fs from "fs";
import md5 from "md5";
import { uniqueProductSlug } from "@/lib/productSlug";
import { requireAdmin } from "@/lib/adminRequest";

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


export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "products");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const productData = JSON.parse(formData.get("product"));
    // Normalize brand_code: keep trimmed when provided, drop when empty
    if (Object.prototype.hasOwnProperty.call(productData, "brand_code")) {
      const trimmed = (productData.brand_code ?? "").toString().trim();
      if (trimmed) {
        productData.brand_code = trimmed;
      } else {
        delete productData.brand_code;
      }
    }

    // ✅ Normalize the new fields
    if (Object.prototype.hasOwnProperty.call(productData, "model_number")) {
      const trimmed = (productData.model_number ?? "").toString().trim();
      productData.model_number = trimmed;
    } else {
      productData.model_number = "";
    }

    if (Object.prototype.hasOwnProperty.call(productData, "movement")) {
      const trimmed = (productData.movement ?? "").toString().trim();
      productData.movement = trimmed;
    } else {
      productData.movement = "";
    }

    if (Object.prototype.hasOwnProperty.call(productData, "size")) {
      const trimmed = (productData.size ?? "").toString().trim();
      productData.size = trimmed;
    } else {
      productData.size = "";
    }


    const imageFiles = formData.getAll("images");
    // const category   = formData.get("category");
    let variants = JSON.parse(formData.get("variant"));
    const Filters    = productData.filters;
    const item_code  = productData.item_code;
    const overviewimageFiles = formData.getAll("overviewImages");
    await connectDB();
    let existingProduct = await Product.findOne({ item_code });
      if (existingProduct) {
        return NextResponse.json({ error: "Product already exists" }, { status: 400 });
      }

    const requestedSlug = (productData.slug || "").toString().trim();
    let slug = requestedSlug
      ? requestedSlug
      : await uniqueProductSlug(productData.name || item_code || "product");
    const existingProductname = await Product.findOne({ slug });
    if (existingProductname) {
      slug = await uniqueProductSlug(productData.name || slug || item_code || "product");
    }
    productData.slug = slug;
    let md5_cat_name = md5(slug);

      // ✅ Duplicate check for model_number (optional - remove if not needed)
      /*
    if (productData.model_number) {
      let existingModel = await Product.findOne({ model_number: productData.model_number });
      if (existingModel) {
        return NextResponse.json({ error: "Product with this model number already exists" }, { status: 400 });
      }
    }
    */

      console.log(productData);
console.log("..............................................................");
 const category = productData.sub_category;

    const savedImages = [];
    const OverviewSavedImages = [];
    if (!imageFiles.length) {
        return NextResponse.json({ error: "No images received" }, { status: 400 });
    }
    const savedVariantImages = [];
    if(productData.hasVariants){
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const variantImages = [];
        
        // Get all images for this variant
        let imgIndex = 0;
        while (true) {
          const imageKey = `variant_${i}_image_${imgIndex}`;
          const imageFile = formData.get(imageKey);
          console.log(imageFile);
          if (!imageFile) break;
          
          // Process and save the image
          const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, "-")}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
          const filePath = path.join(uploadDir, filename);
          
          const buffer = Buffer.from(await imageFile.arrayBuffer());
          await writeFile(filePath, buffer);
          
          variantImages.push(`${filename}`);
          imgIndex++;
        }
        
        variant.images = variantImages;
      }
    }
    const uploadDir = path.join(process.cwd(), "public/uploads/products");
    if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true });
    }
    for (const file of imageFiles) {
      if (!file || typeof file.name !== "string") {
          console.error("Invalid file received:", file);
          continue;
      }
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      savedImages.push(`${filename}`);
    }

    for (const file of overviewimageFiles) {
      if (!file || typeof file.name !== "string") {
          console.error("Invalid file received:", file);
          continue;
      }
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      OverviewSavedImages.push(`${filename}`);
    }

    await connectDB();
    if(productData.quantity <= 0){
        productData.stock_status = "Out of Stock";
    }
    productData.chk_display_store_stock =
      Number(productData.chk_display_store_stock) === 1 ? 1 : 0;

    if(productData.slug != ""){
      productData.slug =slug;
    }
    if(md5_cat_name != ""){
      productData.md5_name =md5_cat_name;
    }
    let main_Category = "";
    let cat_new = "";
    let sub_cat_new = "";
    let sub_cat_name_new = "";
    
    
    if(category != ""){
      const main_cat = await Category.findOne({ _id: category });
      if(main_cat){
        main_Category = main_cat.parentid;
      }
    }
   
    
    if(category != ""){
        
      const chain = await buildCategoryChain(category);
      if(chain){
          // main_Category = chain.root_id;
          cat_new = chain.root_md5;
          sub_cat_new = chain.md5_chain;
          sub_cat_name_new = chain.name_chain;
      }
        
    }
    
    if(!productData.hasVariants){
          variants = [];
        }

    productData.category = main_Category;
    productData.sub_category = category;
    productData.category_new = cat_new;  
    productData.sub_category_new = sub_cat_new;
    productData.sub_category_new_name = sub_cat_name_new;

    const highlights = JSON.parse(formData.get("highlights") || "[]");
    productData.product_highlights = highlights;
    console.log(productData);
    const newProduct = new Product({
      ...productData,
      images: savedImages,
      variants: variants,
      overview_image: OverviewSavedImages,
    });
    await newProduct.save();

    if(newProduct.id){
      const product_id = newProduct._id;
      for (const filter of Filters) {
      const newProductFilter = new Product_filter({
        filter_id: filter,
        product_id: product_id,
      });
      await newProductFilter.save();
      }
    }

    return NextResponse.json(
      { message: "Product created successfully", product: newProduct },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
