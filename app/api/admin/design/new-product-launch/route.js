import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LaunchProduct from "@/models/LaunchProduct";
import fs from "fs";
import path from "path";

async function saveFile(file, type) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "new-product-launch");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean up filename and append type
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}-${type}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    return "/uploads/new-product-launch/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

export async function GET() {
  try {
    await dbConnect();
    const launchProducts = await LaunchProduct.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: launchProducts || [] });
  } catch (err) {
    console.error("Error in GET /api/admin/design/new-product-launch:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const product_name = formData.get("product_name") || formData.get("title");
    const products = formData.get("products") || formData.get("description") || "";
    const highlights = formData.get("highlights") || "";
    const features = formData.get("features") || "";
    const in_the_box = formData.get("in_the_box") || "";
    
    const stock_status = formData.get("stock_status") || "Choose";
    const status = formData.get("status") || "Choose";
    const page_design = formData.get("page_design") || "Choose";
    const emi_starting_price = formData.get("emi_starting_price") || null;
    
    const seo_title = formData.get("seo_title") || "";
    const seo_description = formData.get("seo_description") || "";
    
    const desktop_image_files = formData.getAll("desktop_images");
    const mobile_image_files = formData.getAll("mobile_images");
    const prebook_modal_image_file = formData.get("prebook_modal_image");

    if (!product_name) {
      return NextResponse.json(
        { success: false, message: "Product Name is required" },
        { status: 400 }
      );
    }

    let desktop_images = [];
    for (const file of desktop_image_files) {
      if (file && file.size > 0) {
        desktop_images.push(await saveFile(file, "desktop"));
      }
    }

    let mobile_images = [];
    for (const file of mobile_image_files) {
      if (file && file.size > 0) {
        mobile_images.push(await saveFile(file, "mobile"));
      }
    }
    
    let prebook_modal_image = "";
    if (prebook_modal_image_file && prebook_modal_image_file.size > 0) {
      prebook_modal_image = await saveFile(prebook_modal_image_file, "modal");
    }

    const newProduct = new LaunchProduct({
      title: product_name,
      description: products,
      highlights,
      features,
      in_the_box,
      
      stock_status: stock_status === "In Stock" ? "in_stock" 
                  : stock_status === "Out Of Stock" ? "out_of_stock" 
                  : stock_status === "pre_book" || stock_status === "Pre-Book" ? "pre_book"
                  : stock_status === "coming_soon" ? "coming_soon"
                  : "pre_book",
                  
      status: status === "Active" || status === "published" ? "published" 
            : status === "Inactive" || status === "archived" ? "archived" 
            : status === "scheduled" ? "scheduled"
            : "draft",
            
      design_type: page_design === "New Design" || page_design === "new_iplanet" ? "new_iplanet" : "old",
      emi_starting_price: emi_starting_price ? Number(emi_starting_price) : null,
      seo_title,
      seo_description,
      
      desktop_images: desktop_images.map(url => ({ url })),
      mobile_images: mobile_images.map(url => ({ url })),
      prebook_modal_image,
    });

    await newProduct.save();

    return NextResponse.json({ success: true, data: newProduct, code: 200 });
  } catch (err) {
    console.error("POST ERROR in new-product-launch:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create" },
      { status: 500 }
    );
  }
}
