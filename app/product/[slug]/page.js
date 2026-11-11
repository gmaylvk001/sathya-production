import ProductClient from "./ProductClient";
import { getProductDataCached } from "@/lib/productFetcher";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { normalizeRegion, isKarnatakaPincode } from "@/lib/regionHelper";
import { isLspPdpEnabled } from "@/lib/lspPriceCron";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug;

  try {
    const product = await getProductDataCached(slug, "tamilnadu");

    if (product) {
      const rawTitle = product.meta_title || product.name || "Product";
      const title = String(rawTitle)
        .replace(/\s*\|\s*SATHYA Store\s*$/i, "")
        .trim();
      return {
        title,
        description: product.meta_description || "Shop online at SATHYA Store",
        alternates: {
          canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.sathya.store"}/product/${slug}`,
        },
      };
    }
  } catch (e) {
    // fallback
  }

  const cleanTitle = slug
    ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Product";

  return {
    title: cleanTitle,
  };
}

export default async function ProductPage({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug;

  if (!slug) {
    notFound();
  }

  const cookieStore = await cookies();
  const rawLoc = cookieStore.get("sathya_location")?.value;
  let region = "tamilnadu";
  if (rawLoc) {
    try {
      const decoded = decodeURIComponent(rawLoc);
      const parsed = JSON.parse(decoded);
      const isKarnataka =
        isKarnatakaPincode(parsed.pincode) ||
        /karnataka/i.test(String(parsed.stateName || parsed.state || "")) ||
        normalizeRegion(parsed.region) === "karnataka";
      region = isKarnataka ? "karnataka" : normalizeRegion(parsed.region || parsed.state || parsed.stateName);
    } catch {
      region = normalizeRegion(rawLoc);
    }
  }

  const product = await getProductDataCached(slug, region);

  if (!product) {
    notFound();
  }

  return (
    <ProductClient
      initialProduct={product}
      lspPdpEnabled={isLspPdpEnabled()}
    />
  );
}
