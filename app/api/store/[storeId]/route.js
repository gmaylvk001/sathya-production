// app/api/store/[storeId]/route.js
import { NextResponse } from 'next/server';
import { parseForm } from '@/lib/parseForm';
import connectDB from "@/lib/db";  // Adjust path as per your project structure
import Store from '@/models/store';     // Adjust path to your Store model
import multer from 'multer'; // You might need a file upload library like multer or formidable for Node.js
import path from 'path';
import fs from 'fs/promises'; // For file system operations
import Product from '@/models/product';
import { requireAdmin } from '@/lib/adminRequest';

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
  const { storeId } = context.params;

  if (!storeId) {
    return NextResponse.json(
      { error: "Store identifier is required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const store = await Store.findOne({
      $or: [{ location_id: storeId }, { slug: storeId }],
    }).populate("featuredProducts");

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
  const auth = await requireAdmin(request, "stores");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
      location_id: String(fields.location_id?.[0] || "").trim(),
      multibrandstore:
        String(fields.multibrandstore?.[0] || "").toLowerCase() === "true",
      category: fields.category?.[0] || null,
      description: fields.description?.[0] || "",
      location: fields.location?.[0] || "",
      zipcode: fields.zipcode?.[0] || "",
      address: fields.address?.[0] || "",
      service_area: fields.service_area?.[0] || "",
      city: fields.city?.[0] || "",
      phone: fields.phone?.[0] || "",
      phone_after_hours: fields.phone_after_hours?.[0] || "",
      website: fields.website?.[0] || "",
      email: fields.email?.[0] || "",
      twitter: fields.twitter?.[0] || "",
      facebook: fields.facebook?.[0] || "",
      meta_title: fields.meta_title?.[0] || "",
      meta_description: fields.meta_description?.[0] || "",
      verified: fields.verified?.[0] || "No",
      approved: fields.approved?.[0] || "No",
      user: fields.user?.[0] || "",
      status: fields.status?.[0] || "",
      tags: fields.tags?.[0] ? JSON.parse(fields.tags[0]) : [],
      nearbyStores: JSON.parse(fields.nearbyStores || "[]"),
      businessHours: JSON.parse(fields.businessHours || "[]"),
      keyHighlights: JSON.parse(fields.keyHighlights || "[]"),
    };

    if (!updateData.location_id) {
      return NextResponse.json(
        { error: "Location ID is required." },
        { status: 400 }
      );
    }

    const currentStore = await Store.findOne({
      $or: [{ location_id: storeId }, { slug: storeId }],
    });
    const existingLocationId = await Store.findOne({
      location_id: updateData.location_id,
      _id: { $ne: currentStore?._id },
    });
    if (existingLocationId) {
      return NextResponse.json(
        { error: "Location ID already exists." },
        { status: 400 }
      );
    }

    // ======================================================
    // SOCIAL TIMELINE with Thumbnail Upload Support
    // ======================================================
    // ---------- SOCIAL TIMELINE ----------
updateData.socialTimeline = [];
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
});

    // ---------- LOGO ----------
    if (files.logo?.[0]) {
      updateData.logo = `/uploads/${path.basename(files.logo[0].filepath)}`;
    } else if (fields.existing_logo) {
      updateData.logo = fields.existing_logo[0];
    }

    // ---------- STORE IMAGES ----------
    const storeImages = [];
    const maxImages = Math.max(
  ...Object.keys(files).filter(k => /^store_image_\d+$/.test(k)).map(k => Number(k.split("_").pop()) + 1),
  ...Object.keys(fields).filter(k => /^existing_store_image_\d+$/.test(k)).map(k => Number(k.split("_").pop()) + 1),
  0
);
for (let i = 0; i < maxImages; i++) {
      if (files[`store_image_${i}`]?.[0]) {
        storeImages[i] = `/uploads/${path.basename(files[`store_image_${i}`][0].filepath)}`;
      } else if (fields[`existing_store_image_${i}`]?.[0]) {
        storeImages[i] = fields[`existing_store_image_${i}`][0];
      }
    }
    updateData.store_images = storeImages;

    // ---------- GENERAL IMAGES ----------
    updateData.images = [];

    if (fields.existing_images) {
      updateData.images.push(...JSON.parse(fields.existing_images));
    }

    if (files.images) {
      const imgs = Array.isArray(files.images) ? files.images : [files.images];
      imgs.forEach(f => updateData.images.push(`/uploads/${path.basename(f.filepath)}`));
    }

    // ---------- BANNERS ----------
    updateData.banners = [];
    if (fields.existing_banners?.[0]) {
      updateData.banners.push(...JSON.parse(fields.existing_banners[0]));
    }
    if (files.banners) {
      const banners = Array.isArray(files.banners) ? files.banners : [files.banners];
      banners.forEach(f => updateData.banners.push(`/uploads/${path.basename(f.filepath)}`));
    }
     // ---------- CUSTOMER IMAGES ----------
updateData.customer_images = [];
if (fields.existing_customer_images?.[0]) {
  updateData.customer_images.push(...JSON.parse(fields.existing_customer_images[0]));
}
if (files.customer_images) {
  const imgs = Array.isArray(files.customer_images) ? files.customer_images : [files.customer_images];
  imgs.forEach(f => updateData.customer_images.push(`/uploads/${path.basename(f.filepath)}`));
}
// ---------- FEATURED PRODUCTS ----------
    updateData.featuredProducts = fields.featuredProducts?.[0]
      ? JSON.parse(fields.featuredProducts[0])
      : [];

    // ---------- OFFERS ----------
    updateData.offers = [];
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
    });

    // ---------- HIGHLIGHTS ----------
    updateData.highlights = [];
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
    });

    // ---------- SAVE DB ----------
 

    const updated = await Store.findOneAndUpdate(
      { $or: [{ location_id: storeId }, { slug: storeId }] },
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
    const updatedStore = await Store.findByIdAndUpdate(
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
  const auth = await requireAdmin(request, "stores");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { storeId } = context.params;
  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required." }, { status: 400 });
  }
  try {
    await connectDB();
    const deletedStore = await Store.findByIdAndDelete(storeId);
    if (!deletedStore) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Store permanently deleted." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
