import dbConnect from "@/lib/db";
import ecom_brand_info from "@/models/ecom_brand_info";

let cachedBrands = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getActiveBrandsForSearch() {
  if (cachedBrands && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedBrands;
  }

  await dbConnect();
  cachedBrands = await ecom_brand_info
    .find({ status: "Active" })
    .select("_id brand_name brand_slug status")
    .lean();

  cacheTime = Date.now();
  return cachedBrands;
}
