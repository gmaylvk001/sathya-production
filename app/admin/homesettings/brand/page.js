"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function BrandList() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch("/api/brand/get");
        if (!res.ok) {
          throw new Error(`Failed to fetch brands: ${res.status}`);
        }
        const data = await res.json();

        if (data.success) {
          setBrands(data.brands);
        } else {
          throw new Error(data.message || "Failed to fetch brands");
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d72828] mb-4"></div>
          <p className="text-gray-600 text-lg">Loading brands...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-medium text-lg mb-2">Error Loading Brands</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">All Brands</h2>
        <span className="bg-red-100 text-[#d72828] text-sm font-medium px-3 py-1 rounded-full">
          {brands.length} {brands.length === 1 ? 'Brand' : 'Brands'}
        </span>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No brands found</h3>
          <p className="mt-2 text-gray-500">There are no active brands available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {brands.map((brand) => {
            // Handle different image cases
            let imageSrc = "/no-image.png"; // fallback
            if (brand.image) {
              if (brand.image.startsWith("http")) {
                imageSrc = brand.image; // full external URL
              } else {
                imageSrc = `/uploads/${brand.image}`; // local upload folder
              }
            }

            return (
              <div
                key={brand.id}
                className="flex flex-col items-center p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              >
                <div className="relative w-32 h-20 mb-4 flex items-center justify-center">
                  {imageSrc !== "/no-image.png" ? (
                    <Image
                      src={imageSrc}
                      alt={brand.brand_name}
                      width={128}
                      height={80}
                      className="object-contain"
                      onError={(e) => {
                        e.target.src = "/no-image.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No Image</span>
                    </div>
                  )}
                </div>
                <p className="font-medium text-center text-gray-900">{brand.brand_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}