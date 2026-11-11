import { Suspense } from "react";
import AllProductsClient from "./AllProductsClient";

export const metadata = {
  title: "All Products | SATHYA Store - Best Deals on Electronics & Appliances",
  description:
    "Explore our complete collection of products at SATHYA Store. Best prices on TVs, mobiles, refrigerators, washing machines, kitchen appliances, and more with Lowest Price Guarantee.",
};

export default function AllProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#d72828] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-gray-600">
              Loading All Products...
            </span>
          </div>
        </div>
      }
    >
      <AllProductsClient />
    </Suspense>
  );
}

