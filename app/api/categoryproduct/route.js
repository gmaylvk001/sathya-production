import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import connectDB from "@/lib/db";
import CategoryProduct from "@/models/categoryproduct";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();

    const subcategoryId = formData.get("subcategoryId");
    const subcategoryName = formData.get("subcategoryName"); // Get the category name
    const products = JSON.parse(formData.get("products") || "[]");
    const borderColor = formData.get("borderColor") || "#000000";
    const alignment = formData.get("alignment") || "left";
    const status = formData.get("status") || "Active";
    const position = parseInt(formData.get("position") || "0", 10);

    // ✅ Handle file uploads
    async function saveFile(file) {
      if (!file || typeof file === "string") return null;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name}`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      await writeFile(filepath, buffer);
      return `/uploads/${filename}`;
    }

    /* const bannerImage = await saveFile(formData.get("bannerImage"));
    const categoryImage = await saveFile(formData.get("categoryImage")); */

    // MULTIPLE BANNER IMAGES
    /* const categoryImage = await saveFile(formData.get("categoryImage"));
  const bannerFiles = formData.getAll("bannerImage[]");
  const bannerRedirectUrls = formData.getAll("bannerRedirectUrls[]");

  const bannerImage = [];

  for (let i = 0; i < bannerFiles.length; i++) {
    const imageUrl = await saveFile(bannerFiles[i]);
    bannerImage.push({
      imageUrl,
      redirectUrl: bannerRedirectUrls[i] || "",
    });
  } */

/*     const bannerFiles = formData.getAll("bannerImage");
const bannerUrls = formData.getAll("bannerRedirectUrl");

const bannerImage = [];

for (let i = 0; i < bannerFiles.length; i++) {
  const url = await saveFile(bannerFiles[i]);
  bannerImage.push({
    imageUrl: url,
    redirectUrl: bannerUrls[i] || "",
  });
} */

  // MULTIPLE BANNER IMAGES (indexed keys: bannerImage[0], bannerImage[1], ...)
const bannerImage = [];
const bannerRedirectUrl = [];

let bi = 0;
while (formData.get(`bannerImage[${bi}]`)) {
  const file = formData.get(`bannerImage[${bi}]`);
  const url = await saveFile(file);
  if (url) {
    bannerImage.push(url);
    bannerRedirectUrl.push(formData.get(`bannerRedirectUrl[${bi}]`) || "");
  }
  bi++;
}

// SINGLE CATEGORY IMAGE
const categoryImage = await saveFile(formData.get("categoryImage"));
const categoryRedirectUrl = formData.get("categoryRedirectUrl") || "";


    const saved = await CategoryProduct.findOneAndUpdate(
  { subcategoryId },
  {
    subcategoryId,
    subcategoryName,
    products,
    borderColor,
    alignment,
    status,
    position,
    bannerImage,
    bannerRedirectUrl,
    categoryImage,
    categoryRedirectUrl,
  },
  { upsert: true, new: true }
);

    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (err) {
    console.error("Error saving category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* export async function PUT(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const subcategoryId = formData.get("subcategoryId");
    const subcategoryName = formData.get("subcategoryName"); // Get the category name
    const products = JSON.parse(formData.get("products") || "[]");
    const borderColor = formData.get("borderColor") || "#000000";
    const alignment = formData.get("alignment") || "left";
    const status = formData.get("status") || "Active";
    const position = parseInt(formData.get("position") || "0", 10);
    const bannerRedirectUrl = formData.get("bannerRedirectUrl") || "";
    const categoryRedirectUrl = formData.get("categoryRedirectUrl") || "";

    // Get existing record first
    const existingRecord = await CategoryProduct.findOne({ subcategoryId });
    if (!existingRecord) {
      return NextResponse.json(
        { error: "Category product not found" },
        { status: 404 }
      );
    }

    // ✅ Handle file uploads - only update if new file is provided
    async function handleFile(file, existingPath) {
      // If no file is provided, keep the existing path
      if (!file || file === "null" || file === "undefined") {
        return existingPath;
      }
      
      // If file is a string (already a path), return it
      if (typeof file === "string") {
        return file;
      }
      
      // Otherwise, it's a new file - save it
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name}`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      await writeFile(filepath, buffer);
      return `/uploads/${filename}`;
    }

    const bannerImageFile = formData.get("bannerImage");
    const categoryImageFile = formData.get("categoryImage");

    const bannerImage = await handleFile(bannerImageFile, existingRecord.bannerImage);
    const categoryImage = await handleFile(categoryImageFile, existingRecord.categoryImage);

    const updated = await CategoryProduct.findOneAndUpdate(
      { subcategoryId },
      {
        subcategoryName, // Update the category name
        products,
        borderColor,
        alignment,
        status,
        position,
        bannerImage,
        bannerRedirectUrl,
        categoryImage,
        categoryRedirectUrl,
      },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("Error updating category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} */

  export async function PUT(req) {
  try {
    await connectDB();
    const formData = await req.formData();

    const subcategoryId = formData.get("subcategoryId");
    const subcategoryName = formData.get("subcategoryName");
    const products = JSON.parse(formData.get("products") || "[]");

    const borderColor = formData.get("borderColor") || "#000000";
    const alignment = formData.get("alignment") || "left";
    const status = formData.get("status") || "Active";
    const position = parseInt(formData.get("position") || "0");

    const existingRecord = await CategoryProduct.findOne({ subcategoryId });
    if (!existingRecord) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 🔥 FILE SAVE FUNCTION
    async function saveFile(file) {
      if (!file || typeof file === "string") return file;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = Date.now() + "-" + file.name;
      const filepath = path.join(process.cwd(), "public/uploads", filename);
      await writeFile(filepath, buffer);
      return `/uploads/${filename}`;
    }

    // Existing images to keep (sent by frontend as JSON arrays)
    const keepBannerImages = JSON.parse(formData.get("keepBannerImages") || "[]");
    const keepBannerRedirectUrls = JSON.parse(formData.get("keepBannerRedirectUrls") || "[]");

    // New banner image uploads (indexed: bannerImage[0], bannerImage[1], ...)
    const newBannerImages = [];
    const newBannerUrls = [];

    let i = 0;
    while (formData.get(`bannerImage[${i}]`)) {
      const file = formData.get(`bannerImage[${i}]`);
      const url = await saveFile(file);
      if (url) {
        newBannerImages.push(url);
        newBannerUrls.push(formData.get(`bannerRedirectUrl[${i}]`) || "");
      }
      i++;
    }

    // Final arrays = kept existing + newly uploaded
    const finalBannerImages = [...keepBannerImages, ...newBannerImages];
    const finalBannerUrls = [...keepBannerRedirectUrls, ...newBannerUrls];

    // CATEGORY IMAGE — upload new file if provided, otherwise keep existing
    const categoryImageFile = formData.get("categoryImage");
    const categoryImage = categoryImageFile
      ? await saveFile(categoryImageFile)
      : existingRecord.categoryImage || null;

    const categoryRedirectUrl =
      formData.get("categoryRedirectUrl") ?? existingRecord.categoryRedirectUrl ?? "";

    const updated = await CategoryProduct.findOneAndUpdate(
      { subcategoryId },
      {
        subcategoryName,
        products,
        borderColor,
        alignment,
        status,
        position,
        bannerImage: finalBannerImages,
        bannerRedirectUrl: finalBannerUrls,
        categoryImage,
        categoryRedirectUrl,
      },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


export async function GET() {
  try {
    await connectDB();
    
    const categoryProducts = await CategoryProduct.find({});
    return NextResponse.json(categoryProducts, { status: 200 });
  } catch (err) {
    console.error("Error fetching category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// export async function PUT(req) {
//   try {
//     await connectDB();

//     const formData = await req.formData();
//     const subcategoryId = formData.get("subcategoryId");
//     const subcategoryName = formData.get("subcategoryName"); // Add this line
//     const products = JSON.parse(formData.get("products") || "[]");
//     const borderColor = formData.get("borderColor") || "#000000";
//     const alignment = formData.get("alignment") || "left";
//     const status = formData.get("status") || "Active";
//     const position = parseInt(formData.get("position") || "0", 10);
//     const bannerRedirectUrl = formData.get("bannerRedirectUrl") || "";
//     const categoryRedirectUrl = formData.get("categoryRedirectUrl") || "";

//     // Get existing record first
//     const existingRecord = await CategoryProduct.findOne({ subcategoryId });
//     if (!existingRecord) {
//       return NextResponse.json(
//         { error: "Category product not found" },
//         { status: 404 }
//       );
//     }

//     // ✅ Handle file uploads - only update if new file is provided
//     async function handleFile(file, existingPath) {
//       // If no file is provided, keep the existing path
//       if (!file || file === "null" || file === "undefined") {
//         return existingPath;
//       }
      
//       // If file is a string (already a path), return it
//       if (typeof file === "string") {
//         return file;
//       }
      
//       // Otherwise, it's a new file - save it
//       const bytes = await file.arrayBuffer();
//       const buffer = Buffer.from(bytes);
//       const filename = `${Date.now()}-${file.name}`;
//       const filepath = path.join(process.cwd(), "public", "uploads", filename);
//       await writeFile(filepath, buffer);
//       return `/uploads/${filename}`;
//     }

//     const bannerImageFile = formData.get("bannerImage");
//     const categoryImageFile = formData.get("categoryImage");

//     const bannerImage = await handleFile(bannerImageFile, existingRecord.bannerImage);
//     const categoryImage = await handleFile(categoryImageFile, existingRecord.categoryImage);

//     const updated = await CategoryProduct.findOneAndUpdate(
//       { subcategoryId },
//       {
//         subcategoryName, // Add this field
//         products,
//         borderColor,
//         alignment,
//         status,
//         position,
//         bannerImage,
//         bannerRedirectUrl,
//         categoryImage,
//         categoryRedirectUrl,
//       },
//       { new: true }
//     );

//     return NextResponse.json({ success: true, data: updated }, { status: 200 });
//   } catch (err) {
//     console.error("Error updating category products:", err);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

/* export async function DELETE(req) {
  try {
    await connectDB();
    
    const { subcategoryId } = await req.json();
    
    // Instead of deleting, set status to Inactive
    const updated = await CategoryProduct.findOneAndUpdate(
      { subcategoryId },
      { status: "Inactive" },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json(
        { error: "Category product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("Error updating category product status:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} */


  export async function DELETE(req) {
  try {
    await connectDB();

    const { subcategoryId, imageUrl } = await req.json();

    if (!subcategoryId) {
      return NextResponse.json(
        { error: "subcategoryId required" },
        { status: 400 }
      );
    }

    if (imageUrl) {
      // Remove a specific banner image (and its paired redirect URL by index)
      const record = await CategoryProduct.findOne({ subcategoryId });
      if (!record) {
        return NextResponse.json({ error: "Category product not found" }, { status: 404 });
      }

      const imgIndex = record.bannerImage?.indexOf(imageUrl);
      const redirectUrlToRemove =
        imgIndex >= 0 ? record.bannerRedirectUrl?.[imgIndex] : undefined;

      const updateOp = { $pull: { bannerImage: imageUrl } };
      if (redirectUrlToRemove !== undefined) {
        updateOp.$pull.bannerRedirectUrl = redirectUrlToRemove;
      }

      const updated = await CategoryProduct.findOneAndUpdate(
        { subcategoryId },
        updateOp,
        { new: true }
      );

      return NextResponse.json({ success: true, data: updated });
    } else {
      // No imageUrl — set status to Inactive
      const updated = await CategoryProduct.findOneAndUpdate(
        { subcategoryId },
        { status: "Inactive" },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: "Category product not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: updated });
    }
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
