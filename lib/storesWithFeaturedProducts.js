import mongoose from "mongoose";
import Product from "@/models/product";

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

export function getFeaturedProductEntries(featuredProducts = []) {
  if (!Array.isArray(featuredProducts)) return [];

  return featuredProducts
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string" || item instanceof mongoose.Types.ObjectId) {
        return { id: String(item), legacy: null };
      }

      if (typeof item === "object") {
        const id = normalizeId(item.productId || item._id || item.id);
        const hasLegacyFields =
          item.title || item.name || item.image || item.images?.length;

        return {
          id: mongoose.Types.ObjectId.isValid(id) ? id : null,
          legacy: hasLegacyFields ? item : null,
        };
      }

      const id = String(item);
      return {
        id: mongoose.Types.ObjectId.isValid(id) ? id : null,
        legacy: null,
      };
    })
    .filter(Boolean);
}

function legacyToProductShape(legacy = {}) {
  const image = legacy.image || legacy.images?.[0] || null;
  const images = legacy.images?.length
    ? legacy.images
    : image
      ? [image.replace(/^\/uploads\/products\//, "").replace(/^\/uploads\//, "")]
      : [];

  return {
    _id: legacy._id || legacy.id || null,
    name: legacy.name || legacy.title || "",
    title: legacy.title || legacy.name || "",
    image,
    images,
    price: legacy.price ?? null,
    special_price: legacy.special_price ?? null,
    slug: legacy.slug || "",
    status: legacy.status || "Active",
  };
}

export async function attachFeaturedProductsToStores(stores) {
  const list = stores.map((store) =>
    store?.toObject ? store.toObject() : { ...store }
  );

  const entries = list.flatMap((store) =>
    getFeaturedProductEntries(store.featuredProducts)
  );

  const uniqueIds = [
    ...new Set(entries.map((entry) => entry.id).filter(Boolean)),
  ];

  const legacyTitles = [
    ...new Set(
      entries
        .map((entry) => entry.legacy?.title || entry.legacy?.name)
        .filter(Boolean)
    ),
  ];

  const productsById = new Map();
  const productsByName = new Map();

  if (uniqueIds.length) {
    const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: objectIds } }).lean();
    products.forEach((product) => {
      productsById.set(product._id.toString(), product);
    });
  }

  if (legacyTitles.length) {
    const products = await Product.find({
      name: { $in: legacyTitles },
      status: "Active",
    }).lean();

    products.forEach((product) => {
      productsByName.set(product.name, product);
      productsById.set(product._id.toString(), product);
    });
  }

  return list.map((store) => {
    const storeEntries = getFeaturedProductEntries(store.featuredProducts);

    const featuredProducts = storeEntries
      .map((entry) => {
        if (entry.id && productsById.has(entry.id)) {
          return productsById.get(entry.id);
        }

        const legacyName = entry.legacy?.title || entry.legacy?.name;
        if (legacyName && productsByName.has(legacyName)) {
          return productsByName.get(legacyName);
        }

        if (entry.legacy) {
          return legacyToProductShape(entry.legacy);
        }

        return null;
      })
      .filter(Boolean);

    return { ...store, featuredProducts };
  });
}
