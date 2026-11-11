// app/api/store/[storeId]/route.js
import { NextResponse } from 'next/server';
import { parseForm } from '@/lib/parseForm';
import connectDB from "@/lib/db";  // Adjust path as per your project structure
import mapbox from '@/models/mapbox';     // Adjust path to your Store model
import multer from 'multer'; // You might need a file upload library like multer or formidable for Node.js
import path from 'path';
import fs from 'fs/promises'; // For file system operations

// Configure Multer for file uploads (assuming you're storing files locally)
// For production, consider cloud storage like AWS S3, Cloudinary, etc.
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads', // Files will be saved in public/uploads
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

// Helper to run Multer middleware
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Disable Next.js body parser to allow Multer to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET handler to fetch a single store by ID
export async function GET(request, context) {
  const { storeId } = context.params; // ⚠️ This is slug now

  if (!storeId) {
    return NextResponse.json(
      { error: "Store slug is required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 🔥 FIND BY SLUG instead of ID
    const store = await mapbox.findOne({ slug: storeId });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(store, { status: 200 });
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}


// PUT handler to update an existing store
// ========================
// UPDATED PUT API HANDLER
// ========================
// ========================
// UPDATED PUT API HANDLER WITH VIDEO THUMBNAIL SUPPORT
// ========================
export async function PUT(request, { params }) {
  const { storeId } = params;

  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }

  await connectDB();

  try {
    const { fields, files } = await parseForm(request);

    // ---------- BASIC FIELDS ----------
    const updateData = {
      organisation_name: fields.organisation_name?.[0] || "",
      location: fields.location?.[0] || "",
      zipcode: fields.zipcode?.[0] || "",
      address: fields.address?.[0] || "",
      city: fields.city?.[0] || "",
      phone: fields.phone?.[0] || "",
      website: fields.website?.[0] || "",
      status: fields.status?.[0] || "",
      businessHours: JSON.parse(fields.businessHours || "[]"),
    };

    // ======================================================
    // SOCIAL TIMELINE with Thumbnail Upload Support
    // ======================================================
    // ---------- SOCIAL TIMELINE ----------
/* updateData.socialTimeline = [];
const socialPayload = fields.socialPayload ? JSON.parse(fields.socialPayload[0]) : [];

socialPayload.forEach((item, i) => {
  let thumbnail = item.thumbnail || null;

  // If new thumbnail uploaded
  if (files[`social_thumbnail_${i}`]?.[0]) {
    thumbnail = `/uploads/${path.basename(files[`social_thumbnail_${i}`][0].filepath)}`;
  }

  updateData.socialTimeline.push({
    media: item.media || "",
    text: item.text || "",
    postedOn: item.postedOn || "",
    thumbnail: thumbnail
  });
}); */

    // ---------- LOGO ----------
    /* if (files.logo?.[0]) {
      updateData.logo = `/uploads/${path.basename(files.logo[0].filepath)}`;
    } else if (fields.existing_logo) {
      updateData.logo = fields.existing_logo[0];
    } */

    // ---------- STORE IMAGES ----------
    const storeImages = [];
    for (let i = 0; i < 3; i++) {
      if (files[`store_image_${i}`]?.[0]) {
        storeImages[i] = `/uploads/${path.basename(files[`store_image_${i}`][0].filepath)}`;
      } else if (fields[`existing_store_image_${i}`]?.[0]) {
        storeImages[i] = fields[`existing_store_image_${i}`][0];
      }
    }
    updateData.store_images = storeImages;

    // ---------- GENERAL IMAGES ----------
    /* updateData.images = [];

    if (fields.existing_images) {
      updateData.images.push(...JSON.parse(fields.existing_images));
    }

    if (files.images) {
      const imgs = Array.isArray(files.images) ? files.images : [files.images];
      imgs.forEach(f => updateData.images.push(`/uploads/${path.basename(f.filepath)}`));
    } */

    // ---------- BANNERS ----------
    /* updateData.banners = [];
    if (fields.existing_banners?.[0]) {
      updateData.banners.push(...JSON.parse(fields.existing_banners[0]));
    }
    if (files.banners) {
      const banners = Array.isArray(files.banners) ? files.banners : [files.banners];
      banners.forEach(f => updateData.banners.push(`/uploads/${path.basename(f.filepath)}`));
    } */

    // ---------- FEATURED PRODUCTS ----------
    /* updateData.featuredProducts = [];
    const featuredPayload = fields.featuredPayload
      ? JSON.parse(fields.featuredPayload[0])
      : [];

    featuredPayload.forEach((item, i) => {
      const newImage = files[`featured_image_${i}`]?.[0];
      updateData.featuredProducts.push({
        title: item.title,
        image: newImage
          ? `/uploads/${path.basename(newImage.filepath)}`
          : item.image,
      });
    }); */

    // ---------- OFFERS ----------
    /* updateData.offers = [];
    const offersPayload = fields.offersPayload
      ? JSON.parse(fields.offersPayload[0])
      : [];

    offersPayload.forEach((item, i) => {
      const newImage = files[`offer_image_${i}`]?.[0];
      updateData.offers.push({
        title: item.title,
        validTill: item.validTill,
        description: item.description,
        image: newImage
          ? `/uploads/${path.basename(newImage.filepath)}`
          : item.image,
      });
    }); */

    // ---------- HIGHLIGHTS ----------
    /* updateData.highlights = [];
    const highlightsPayload = fields.highlightsPayload
      ? JSON.parse(fields.highlightsPayload[0])
      : [];

    highlightsPayload.forEach((item, i) => {
      const newImage = files[`highlight_image_${i}`]?.[0];
      updateData.highlights.push({
        label: item.label,
        image: newImage
          ? `/uploads/${path.basename(newImage.filepath)}`
          : item.image,
      });
    }); */

    // ---------- SAVE DB ----------
 

    const updated = await mapbox.findOneAndUpdate(
      { slug: storeId },        // <--- MATCH BY SLUG
      { $set: updateData },  // <--- UPDATE DATA
      { new: true }          // <--- RETURN UPDATED DOC
    );

    return NextResponse.json({ success: true, store: updated });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




// PATCH handler to update store status to Inactive (from previous request)
export async function PATCH(request, context) {
  const { storeId } = context.params;


  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }

  try {
    await connectDB();
    const updatedStore = await mapbox.findByIdAndUpdate(
      storeId,
      { status: "Inactive" },
      { new: true, runValidators: true }
    );

    if (!updatedStore) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Store status updated to Inactive.", store: updatedStore }, { status: 200 });
  } catch (error) {
    console.error("Error inactivating store:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// DELETE handler for permanent deletion (optional, if you want this functionality)
export async function DELETE(request, context) {
  const { storeId } = context.params;
  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }
  try {
    await connectDB();
    const deletedStore = await mapbox.findByIdAndDelete(storeId);
    if (!deletedStore) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Store permanently deleted." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
