import mapbox from "@/models/mapbox";
import connectDB from "@/lib/db";
import path from "path";
import fs from "fs/promises";

// Simple slugify helper (no external pkg)
function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Helper to safely parse JSON fields (returns fallback on error)
function safeParseJSON(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();

    // Temp containers
    const newStoreData = {};
    const filesMap = {}; // key -> array of File objects

    // iterate formData once: separate files and fields
    /* for (const [key, value] of formData.entries()) {
      // File-like object (has 'name' and a `arrayBuffer` method)
      const isFile =
        value &&
        typeof value === "object" &&
        typeof value.arrayBuffer === "function" &&
        "name" in value;

      if (isFile) {
        filesMap[key] = filesMap[key] || [];
        filesMap[key].push(value);
        continue;
      }

      // Text field: treat certain keys as JSON
      if (
        [
          "tags",
          "banners",
          "featuredProducts",
          "offers",
          "highlights",
          "keyHighlights",
          "nearbyStores",
          "businessHours",
          "socialTimeline",
          "featuredPayload",
          "offersPayload",
          "highlightsPayload",
          "socialPayload",
        ].includes(key)
      ) {
        // Some clients may send JSON already, others send stringified JSON.
        newStoreData[key] = safeParseJSON(value, []);
      } else {
        newStoreData[key] = value;
      }
    } */

    // -----------------------
    // Generate unique slug
    // -----------------------
    const baseSlug = slugify(newStoreData.organisation_name || "");
    let uniqueSlug = baseSlug || `store-${Date.now()}`;
    let counter = 1;
    while (await mapbox.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }
    newStoreData.slug = uniqueSlug;

    // ---------------------------------------
    // Helper to write File -> /public/uploads and return URL path
    // ---------------------------------------
    async function saveFileToUploads(file, prefix = "") {
      const buffer = Buffer.from(await file.arrayBuffer());
      // ensure unique filename
      const safeName = file.name.replace(/\s+/g, "-");
      const filename = `${Date.now()}${prefix ? "-" + prefix : ""}-${Math.round(Math.random() * 1e6)}-${safeName}`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      await fs.writeFile(filepath, buffer);
      return `/uploads/${filename}`;
    }

    // -----------------------
    // LOGO
    // -----------------------
    /* if (filesMap.logo && filesMap.logo[0]) {
      newStoreData.logo = await saveFileToUploads(filesMap.logo[0], "logo");
    } else if (newStoreData.existing_logo) {
      // support existing_logo sent as text fallback
      newStoreData.logo = newStoreData.existing_logo;
    } */

    // -----------------------
    // STORE IMAGES (any indexed fields like store_image_0... OR filesMap.store_images)
    // -----------------------
    newStoreData.store_images = [];

    // If client sent indexed keys like store_image_0, store_image_1...
    const indexedStoreImageKeys = Object.keys(filesMap).filter((k) =>
      /^store_image_\d+$/.test(k)
    );
    if (indexedStoreImageKeys.length) {
      // sort by index
      indexedStoreImageKeys
        .sort((a, b) => {
          const ai = Number(a.split("_").pop());
          const bi = Number(b.split("_").pop());
          return ai - bi;
        })
        .forEach((k) => {
          filesMap[k].forEach(async (f) => {
            // will be processed below synchronously with await; but to keep ordering we push placeholders then replace
          });
        });
      // process in index order
      for (const k of indexedStoreImageKeys.sort((a, b) => Number(a.split("_").pop()) - Number(b.split("_").pop()))) {
        for (const f of filesMap[k]) {
          const url = await saveFileToUploads(f, "storeimg");
          newStoreData.store_images.push(url);
        }
      }
    } else if (filesMap.store_images) {
      for (const f of filesMap.store_images) {
        const url = await saveFileToUploads(f, "storeimg");
        newStoreData.store_images.push(url);
      }
    } else if (newStoreData.existing_store_images) {
      // optionally clients can send existing_store_images JSON array
      newStoreData.store_images.push(...safeParseJSON(newStoreData.existing_store_images, []));
    }

    // -----------------------
    // GENERAL IMAGES (filesMap.images or existing_images JSON)
    // -----------------------
    /* newStoreData.images = [];
    if (filesMap.images) {
      for (const f of filesMap.images) {
        newStoreData.images.push(await saveFileToUploads(f, "img"));
      }
    }
    if (newStoreData.existing_images) {
      // existing_images may be a JSON string or array
      newStoreData.images.push(...(Array.isArray(newStoreData.existing_images) ? newStoreData.existing_images : safeParseJSON(newStoreData.existing_images, [])));
    }
    if (newStoreData.images.length === 0 && Array.isArray(newStoreData.images) === false) {
      newStoreData.images = newStoreData.images || [];
    } */

    // -----------------------
    // BANNERS
    // client commonly appends multiple files under 'banners', or sends 'banners' JSON array for existing urls
    // -----------------------
    /* newStoreData.banners = [];
    if (filesMap.banners) {
      for (const f of filesMap.banners) {
        newStoreData.banners.push(await saveFileToUploads(f, "banner"));
      }
    } else {
      // also support keys like banner_0, banner_1
      const bannerIndexed = Object.keys(filesMap).filter((k) => /^banner(_|_image_)?\d*$/.test(k));
      if (bannerIndexed.length) {
        // sort keys alpha (they usually include index)
        bannerIndexed.sort();
        for (const k of bannerIndexed) {
          for (const f of filesMap[k]) {
            newStoreData.banners.push(await saveFileToUploads(f, "banner"));
          }
        }
      }
    } */
    // existing banners JSON
    /* if (newStoreData.existing_banners) {
      newStoreData.banners.push(...(Array.isArray(newStoreData.existing_banners) ? newStoreData.existing_banners : safeParseJSON(newStoreData.existing_banners, [])));
    }
    // If payload sent as 'banners' JSON (client might have sent that)
    if (Array.isArray(newStoreData.banners) && newStoreData.banners.length === 0 && Array.isArray(newStoreData.banners) === false) {
      newStoreData.banners = newStoreData.banners || [];
    } */

    // -----------------------
    // FEATURED PRODUCTS
    // - payload could come as featuredPayload (client created) or featuredProducts (legacy)
    // - images may be files 'featured_image_<i>' or existing urls in payload
    // -----------------------
    /* const featuredPayload = newStoreData.featuredPayload?.length ? newStoreData.featuredPayload : (newStoreData.featuredProducts || []);
    newStoreData.featuredProducts = [];

    for (let i = 0; i < featuredPayload.length; i++) {
      const item = featuredPayload[i] || {};
      // file key name
      const fileKey = `featured_image_${i}`;
      let imageUrl = item.image || null;

      if (filesMap[fileKey] && filesMap[fileKey][0]) {
        imageUrl = await saveFileToUploads(filesMap[fileKey][0], `featured-${i}`);
      }

      newStoreData.featuredProducts.push({
        title: item.title || item.name || "",
        image: imageUrl,
      });
    } */

    // -----------------------
    // OFFERS
    // - payload: offersPayload or offers
    // - images: offer_image_<i>
    // -----------------------
    /* const offersPayload = newStoreData.offersPayload?.length ? newStoreData.offersPayload : (newStoreData.offers || []);
    newStoreData.offers = [];

    for (let i = 0; i < offersPayload.length; i++) {
      const item = offersPayload[i] || {};
      const fileKey = `offer_image_${i}`;
      let imageUrl = item.image || null;

      if (filesMap[fileKey] && filesMap[fileKey][0]) {
        imageUrl = await saveFileToUploads(filesMap[fileKey][0], `offer-${i}`);
      }

      newStoreData.offers.push({
        title: item.title || "",
        validTill: item.validTill || item.valid_till || "",
        description: item.description || "",
        image: imageUrl,
      });
    } */

    // -----------------------
    // HIGHLIGHTS
    // - payload: highlightsPayload or highlights
    // - images: highlight_image_<i>
    // -----------------------
    /* const highlightsPayload = newStoreData.highlightsPayload?.length ? newStoreData.highlightsPayload : (newStoreData.highlights || []);
    newStoreData.highlights = [];

    for (let i = 0; i < highlightsPayload.length; i++) {
      const item = highlightsPayload[i] || {};
      const fileKey = `highlight_image_${i}`;
      let imageUrl = item.image || null;

      if (filesMap[fileKey] && filesMap[fileKey][0]) {
        imageUrl = await saveFileToUploads(filesMap[fileKey][0], `highlight-${i}`);
      }

      newStoreData.highlights.push({
        label: item.label || "",
        image: imageUrl,
      });
    } */

    // -----------------------
    // KEY HIGHLIGHTS (optional)
    // -----------------------
    /* if (!Array.isArray(newStoreData.keyHighlights)) newStoreData.keyHighlights = [];
    if (newStoreData.keyHighlights.length === 0 && newStoreData.keyHighlights instanceof Array === false) {
      newStoreData.keyHighlights = [];
    } */

    // -----------------------
    // NEARBY STORES & BUSINESS HOURS are expected JSON arrays already parsed above
    // -----------------------
    newStoreData.nearbyStores = Array.isArray(newStoreData.nearbyStores) ? newStoreData.nearbyStores : safeParseJSON(newStoreData.nearbyStores, []);
    newStoreData.businessHours = Array.isArray(newStoreData.businessHours) ? newStoreData.businessHours : safeParseJSON(newStoreData.businessHours, []);

    // -----------------------
    // SOCIAL TIMELINE
    // - payload may be 'socialPayload' or 'socialTimeline'
    // - thumbnails may be files social_thumbnail_<i> OR social_thumb_<i>
    // -----------------------
    /* const socialPayload = newStoreData.socialPayload?.length ? newStoreData.socialPayload : (newStoreData.socialTimeline || []);
    newStoreData.socialTimeline = [];

    for (let i = 0; i < socialPayload.length; i++) {
      const item = socialPayload[i] || {};
      const thumbKey1 = `social_thumbnail_${i}`;
      const thumbKey2 = `social_thumb_${i}`;
      let thumbnailUrl = item.thumbnail || null;

      if (filesMap[thumbKey1] && filesMap[thumbKey1][0]) {
        thumbnailUrl = await saveFileToUploads(filesMap[thumbKey1][0], `social-thumb-${i}`);
      } else if (filesMap[thumbKey2] && filesMap[thumbKey2][0]) {
        thumbnailUrl = await saveFileToUploads(filesMap[thumbKey2][0], `social-thumb-${i}`);
      }

      newStoreData.socialTimeline.push({
        media: item.media || "",
        text: item.text || "",
        postedOn: item.postedOn || item.posted_on || "",
        thumbnail: thumbnailUrl,
      });
    } */

    // -----------------------
    // Other scalar fields fallback (copy a set of common fields if present)
    // -----------------------
    const scalarCandidates = [
      "organisation_name",
      "location",
      "zipcode",
      "address",
      "city",
      "phone",
      "website",
      "status",
    ];
    for (const k of scalarCandidates) {
      if (typeof newStoreData[k] === "undefined" && formData.get(k)) {
        newStoreData[k] = formData.get(k);
      }
    }

    // Ensure arrays exist
    /* newStoreData.tags = Array.isArray(newStoreData.tags) ? newStoreData.tags : safeParseJSON(newStoreData.tags || "[]", []);
    newStoreData.banners = Array.isArray(newStoreData.banners) ? newStoreData.banners : [];
    newStoreData.featuredProducts = Array.isArray(newStoreData.featuredProducts) ? newStoreData.featuredProducts : [];
    newStoreData.offers = Array.isArray(newStoreData.offers) ? newStoreData.offers : [];
    newStoreData.highlights = Array.isArray(newStoreData.highlights) ? newStoreData.highlights : [];
    newStoreData.nearbyStores = Array.isArray(newStoreData.nearbyStores) ? newStoreData.nearbyStores : [];
    newStoreData.businessHours = Array.isArray(newStoreData.businessHours) ? newStoreData.businessHours : [];
    newStoreData.socialTimeline = Array.isArray(newStoreData.socialTimeline) ? newStoreData.socialTimeline : []; */

    // FINAL SAVE
    const record = await mapbox.create(newStoreData);

    return new Response(JSON.stringify({ success: true, data: record }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Create Store Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
