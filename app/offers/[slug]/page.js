import React from "react";
import Link from "next/link";
import { getOfferBySlug } from "@/lib/offersHelper";
import OfferSlugClient from "./OfferSlugClient";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug || "";

  try {
    const result = await getOfferBySlug(slug);
    if (!result || !result.offer) {
      return {
        title: "Special Offers | Sathya Store",
        description: "Explore the best electronic deals and offers on Sathya Store.",
      };
    }

    const { offer } = result;
    return {
      title: `${offer.offerName} - Best Deals & Discounts | Sathya Store`,
      description:
        offer.description ||
        `Check out exclusive ${offer.offerName} at Sathya Store. Grab top electronics, gadgets, and home appliances at discounted prices.`,
      openGraph: {
        title: `${offer.offerName} | Sathya Store`,
        description: offer.description || `Exclusive deals on ${offer.offerName}`,
      },
    };
  } catch (error) {
    console.error("Error generating offer metadata:", error);
    return {
      title: "Offers | Sathya Store",
      description: "Exclusive offers and discounts at Sathya Store.",
    };
  }
}

export default async function OfferSlugPage({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug || "";

  let result = null;
  try {
    result = await getOfferBySlug(slug);
  } catch (error) {
    console.error("Error loading offer page data:", error);
  }

  if (!result || !result.offer) {
    return (
      <div className="container mx-auto px-4 py-16 text-center min-h-[55vh] flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 text-3xl font-bold">
          !
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Offer Not Found</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
          We couldn't find the offer campaign you are looking for. It may have expired or been moved.
        </p>
        <Link
          href="/"
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow transition"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const { offer, products, brandMap } = result;

  const plainOffer = JSON.parse(JSON.stringify(offer));
  const plainProducts = JSON.parse(JSON.stringify(products || []));
  const plainBrandMap = JSON.parse(JSON.stringify(brandMap || {}));

  return (
    <OfferSlugClient
      offer={plainOffer}
      initialProducts={plainProducts}
      brandMap={plainBrandMap}
      slug={slug}
    />
  );
}
