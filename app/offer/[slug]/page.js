import React from "react";
import Link from "next/link";
import dbConnect from "@/lib/db";
import OfferModule from "@/models/OfferModule";
import OfferModuleProduct from "@/models/OfferModuleProduct";
import OfferClient from "./OfferClient";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = String(awaitedParams?.slug || "").toLowerCase().trim();

  try {
    await dbConnect();
    const offer = await OfferModule.findOne({ slug }).lean();
    if (!offer) {
      return {
        title: "Special Offer | Sathya Store",
        description: "Explore exclusive offers and discounts at Sathya Store.",
      };
    }
    return {
      title: `${offer.offerName} | Sathya Store`,
      description:
        offer.description ||
        `Check out exclusive ${offer.offerName} deals at Sathya Store.`,
    };
  } catch {
    return {
      title: "Special Offer | Sathya Store",
      description: "Explore exclusive offers and discounts at Sathya Store.",
    };
  }
}

export default async function OfferLegacyPage({ params }) {
  const awaitedParams = await params;
  const slug = String(awaitedParams?.slug || "").toLowerCase().trim();

  await dbConnect();
  const offer = await OfferModule.findOne({ slug }).lean();

  if (!offer) {
    return (
      <div className="container mx-auto px-4 py-16 text-center min-h-[55vh] flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 text-3xl font-bold">
          !
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Offer Not Found</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
          We couldn&apos;t find the offer campaign you are looking for. It may have expired or been moved.
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

  const products = await OfferModuleProduct.find({ offerId: offer._id })
    .sort({ createdAt: -1 })
    .lean();

  const plainOffer = JSON.parse(JSON.stringify(offer));
  const plainProducts = JSON.parse(JSON.stringify(products || []));

  return <OfferClient offer={plainOffer} products={plainProducts} />;
}
