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

function deleteFileIfExists(relativePath) {
  if (!relativePath) return;
  try {
    const filePath = path.join(process.cwd(), "public", relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Failed to delete old file:", err);
  }
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const launchProduct = await LaunchProduct.findById(id);
    if (!launchProduct) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: launchProduct });
  } catch (err) {
    console.error("Error in GET /api/admin/design/new-product-launch/[id]:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const formData = await req.formData();

    const existingProduct = await LaunchProduct.findById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Launch Product not found" },
        { status: 404 }
      );
    }

    let updateData = {};
    const product_name = formData.get("product_name");
    if (product_name !== null) updateData.product_name = product_name;
    
    const products = formData.get("products");
    if (products !== null) updateData.products = products;

    const stock_status = formData.get("stock_status");
    if (stock_status !== null) updateData.stock_status = stock_status;

    const status = formData.get("status");
    if (status !== null) updateData.status = status;

    const page_design = formData.get("page_design");
    if (page_design !== null) updateData.page_design = page_design;

    const desktop_image_files = formData.getAll("desktop_images");
    for (const file of desktop_image_files) {
      if (file && file.size > 0) {
        const filePath = await saveFile(file, "desktop");
        updateData.$push = updateData.$push || {};
        updateData.$push.desktop_images = filePath;
      }
    }

    const mobile_image_files = formData.getAll("mobile_images");
    for (const file of mobile_image_files) {
      if (file && file.size > 0) {
        const filePath = await saveFile(file, "mobile");
        updateData.$push = updateData.$push || {};
        updateData.$push.mobile_images = filePath;
      }
    }

    // Handle deletion of existing images
    const delete_desktop_images = formData.getAll("delete_desktop_images");
    const delete_mobile_images = formData.getAll("delete_mobile_images");
    
    if (delete_desktop_images.length > 0 || delete_mobile_images.length > 0) {
      updateData.$pull = updateData.$pull || {};
      if (delete_desktop_images.length > 0) {
        updateData.$pull.desktop_images = { $in: delete_desktop_images };
        delete_desktop_images.forEach(deleteFileIfExists);
      }
      if (delete_mobile_images.length > 0) {
        updateData.$pull.mobile_images = { $in: delete_mobile_images };
        delete_mobile_images.forEach(deleteFileIfExists);
      }
    }

    // Force slug update if title changed
    if (product_name && product_name !== existingProduct.product_name) {
      updateData.$set = updateData.$set || {};
      updateData.$set.slug = product_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }

    // Move basic string fields into $set
    updateData.$set = updateData.$set || {};
    if (product_name !== null) updateData.$set.product_name = product_name;
    if (products !== null) updateData.$set.products = products;
    if (stock_status !== null) updateData.$set.stock_status = stock_status;
    if (status !== null) updateData.$set.status = status;
    if (page_design !== null) updateData.$set.page_design = page_design;

    const updatedProduct = await LaunchProduct.findByIdAndUpdate(id, updateData, { new: true });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (err) {
    console.error("PUT ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    const existingProduct = await LaunchProduct.findById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Launch Product not found" },
        { status: 404 }
      );
    }

    (existingProduct.desktop_images || []).forEach(deleteFileIfExists);
    (existingProduct.mobile_images || []).forEach(deleteFileIfExists);

    await LaunchProduct.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to delete" },
      { status: 500 }
    );
  }
}
