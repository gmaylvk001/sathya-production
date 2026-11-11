import { notFound } from "next/navigation";
import Image from "next/image";
import dbConnect from "@/lib/db";
import { getLaunchProductBySlug } from "@/lib/services/launchProduct.service";

import ProductDetailClient from "./components/ProductDetailClient";

// Make it a dynamic server component if needed, or revalidate appropriately
export const revalidate = 60; 

export default async function NewLaunchingProductPDP({ params }) {
  await dbConnect();
  
  let dbProduct = null;
  try {
    dbProduct = await getLaunchProductBySlug(params.slug);
  } catch (error) {
    notFound();
  }

  if (!dbProduct || dbProduct.status !== "published") {
    notFound();
  }

  // Map LaunchProduct model to a Universal Product Shape
  const images = [];
  if (dbProduct.desktop_images && dbProduct.desktop_images.length > 0) {
    dbProduct.desktop_images.forEach(img => images.push(img.url));
  }
  if (dbProduct.mobile_images && dbProduct.mobile_images.length > 0) {
    // Optionally mix in mobile images or just keep desktop for the gallery
    // We will just use desktop images for the main gallery
  }

  const product = {
    name: dbProduct.title,
    brand: "", // Our model currently doesn't store brand
    category: "", // Our model currently doesn't store category
    images: images.length > 0 ? images : ["/no-image.jpg"],
    
    // We only have emi_starting_price, no base price or MRP in this schema
    price: null, 
    mrp: null,
    discount: null,
    emiStartingPrice: dbProduct.emi_starting_price,
    currency: "₹",
    
    stock: dbProduct.stock_status || "pre_book", // "in_stock", "out_of_stock", "pre_book", "coming_soon"
    
    description: dbProduct.description,
    highlights: dbProduct.highlights,
    features: dbProduct.features,
    inTheBox: dbProduct.in_the_box,
    
    warranty: dbProduct.warranty || [],
    
    // Extensibility for later
    specifications: [],
    variants: [],
    offers: [],
    rating: null,
    reviewCount: null,
    delivery: null,
  };
  
  return (
    <ProductDetailClient product={product} />
  );
}

export async function generateMetadata({ params }) {
  await dbConnect();
  try {
    const product = await getLaunchProductBySlug(params.slug);
    if (!product) return {};
    
    return {
      title: product.seo_title || `${product.title} - Pre-book Now`,
      description: product.seo_description || product.title,
    };
  } catch (error) {
    return {};
  }
}
