import dbConnect from "@/lib/db";
import OfferModule from "@/models/OfferModule";
import Product from "@/models/product";
import OfferModuleProduct from "@/models/OfferModuleProduct";
import BrandInfo from "@/models/ecom_brand_info";

export function generateSlug(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetches an offer by its slug along with its mapped or fallback products.
 */
export async function getOfferBySlug(slug) {
  if (!slug) return null;
  await dbConnect();

  const cleanSlug = slug.toLowerCase().trim();
  const offer = await OfferModule.findOne({ slug: cleanSlug }).lean();

  if (!offer) return null;

  let products = [];

  // 1. Offer-module products (admin offer-product), then match store products by name
  if (offer._id) {
    try {
      const legacyOfferProducts = await OfferModuleProduct.find({ offerId: offer._id }).lean();
      if (legacyOfferProducts.length > 0) {
        const names = legacyOfferProducts.map((p) => p.productName).filter(Boolean);
        if (names.length > 0) {
          products = await Product.find({
            name: { $in: names },
            status: "Active",
          }).lean();
        }
      }
    } catch (err) {
      console.warn("[OffersHelper] Error querying offer products:", err.message);
    }
  }

  // 2. Fallback for known slugs so storefront can still show products
  if (products.length === 0) {
    try {
      if (cleanSlug === "big-discounts") {
        // Products with heavy discount
        products = await Product.find({
          status: "Active",
          stock_status: "In Stock",
          special_price: { $gt: 0 },
          $expr: { $gt: ["$price", "$special_price"] },
        })
          .sort({ createdAt: -1 })
          .limit(32)
          .lean();
      } else if (cleanSlug === "weekend-offers") {
        // High-demand active in-stock products
        products = await Product.find({
          status: "Active",
          stock_status: "In Stock",
        })
          .sort({ createdAt: -1 })
          .limit(32)
          .lean();
      } else if (cleanSlug === "bundle-offer") {
        // Bundle / combo / discounted products
        products = await Product.find({
          status: "Active",
          $or: [
            { category: /combo/i },
            { sub_category: /combo/i },
            { name: /combo/i },
            { name: /bundle/i },
            { is_common_type: 1 },
          ],
        })
          .limit(32)
          .lean();

        // If not enough combos found, fallback to active top products
        if (products.length < 8) {
          const extra = await Product.find({
            status: "Active",
            stock_status: "In Stock",
          })
            .sort({ createdAt: -1 })
            .limit(24)
            .lean();
          products = [...products, ...extra].slice(0, 32);
        }
      }
    } catch (err) {
      console.warn("[OffersHelper] Error loading fallback products:", err.message);
    }
  }

  // Build brandMap for correct brand label display in ProductCard
  let brandMap = {};
  try {
    const brands = await BrandInfo.find({}, "_id brand_name brand_slug").lean();
    brandMap = brands.reduce((acc, b) => {
      acc[String(b._id)] = b.brand_name || b.name || "";
      return acc;
    }, {});
  } catch (err) {
    console.warn("[OffersHelper] Error fetching brand map:", err.message);
  }

  // Convert all Mongoose documents, ObjectIds, and Dates to pure plain objects
  return JSON.parse(
    JSON.stringify({
      offer,
      products,
      brandMap,
    })
  );
}
