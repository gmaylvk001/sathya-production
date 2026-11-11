import ProductClient from "@/app/product/[slug]/ProductClient";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug;
  const sub_slug = awaitedParams.sub_slug;
  const sub_slug_one = awaitedParams.sub_slug_one;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://www.sathya.store";

  try {
    await dbConnect();
    const product = await Product.findOne({ slug: sub_slug_one, status: "Active" })
      .select("name meta_title meta_description description images search_keywords")
      .lean();

    if (!product) {
      return {
        title: "Product not found",
        description: "This product is unavailable",
      };
    }

    const title = product.meta_title || product.name;
    const description =
      product.meta_description ||
      product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
      "Buy products online at best price";

    const image =
      product.images?.length > 0
        ? `${baseUrl}/uploads/products/${product.images[0]}`
        : `${baseUrl}/no-image.jpg`;

    return {
      title,
      description,
      keywords: product.search_keywords || "",

      openGraph: {
        title,
        description,
        url: `${baseUrl}/category/${slug}/${sub_slug}/${sub_slug_one}`,
        images: [image],
        type: "website",
      },

      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    console.error("Metadata error:", error);
    return {
      title: "Product",
      description: "Buy products online",
    };
  }
}

export default async function ProductPage({ params }) {
  const awaitedParams = await params;
  const sub_slug_one = awaitedParams?.sub_slug_one;

  if (!sub_slug_one) {
    notFound();
  }

  await dbConnect();
  const product = await Product.findOne({ slug: sub_slug_one, status: "Active" })
    .select("_id")
    .lean();

  if (!product) {
    notFound();
  }

  return <ProductClient />;
}
