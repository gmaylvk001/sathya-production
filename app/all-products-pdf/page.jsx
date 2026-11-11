import { Suspense } from "react";
import AllProductsPdfClient from "./AllProductsPdfClient";

export const metadata = {
  title: "Sathya - Store Products PDF",
  description: "Product catalog and price list",
};

export default function AllProductsPdfPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-10 font-sans text-sm text-gray-500">
          Loading Products for PDF Export...
        </div>
      }
    >
      <AllProductsPdfClient />
    </Suspense>
  );
}

