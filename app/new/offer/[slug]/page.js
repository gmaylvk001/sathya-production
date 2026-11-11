import React from "react";
import OfferSlugPage, { generateMetadata as baseGenerateMetadata } from "@/app/offers/[slug]/page";

export async function generateMetadata({ params }) {
  return baseGenerateMetadata({ params });
}

export default async function NewOfferPage({ params }) {
  return <OfferSlugPage params={params} />;
}
