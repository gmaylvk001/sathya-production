"use client";

import React from "react";
import ProductOffersSection from "./ProductOffersSection";

/**
 * RazorpayOffers
 * Converted into a dynamic Payment Offers presentation layer.
 * Receives product context/id/amount and presents dynamic EMI & Bank Offers
 * with loading states, error safety, empty states, Best Deal/Best Offer badges,
 * and View All modals.
 */
export default function RazorpayOffers({
  product = null,
  productId = null,
  amount = null,
  className = "",
}) {
  // Construct product context from available props
  const resolvedProduct =
    product ||
    (productId
      ? { _id: productId, special_price: amount }
      : amount !== null
      ? { special_price: amount }
      : {});

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ProductOffersSection
        product={resolvedProduct}
        productId={productId || product?._id}
      />
    </div>
  );
}

