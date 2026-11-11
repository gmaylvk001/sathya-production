"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiSearch, FiX } from "react-icons/fi";
import { buildBrandHref } from "@/lib/categoryPageComponents/categoryHref";

const ALPHABETS = [
  "ALL",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
];

function slugify(text) {
  return text
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function getBrandImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return `/uploads/Brands/${image}`;
}

export default function AllBrandsView() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchAllActiveBrands = async () => {
      try {
        setLoading(true);
        // Fetch all active brands (no homePage filter, so all active brands are returned)
        const res = await fetch("/api/brand/get", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch brands");
        const data = await res.json();

        if (isMounted && data?.success && Array.isArray(data.brands)) {
          // Sort alphabetically by brand_name
          const sorted = [...data.brands].sort((a, b) =>
            (a.brand_name || "").localeCompare(b.brand_name || "", undefined, {
              sensitivity: "base",
            })
          );
          setBrands(sorted);
        } else if (isMounted) {
          setBrands([]);
        }
      } catch (err) {
        console.error("Error loading brands:", err);
        if (isMounted) setBrands([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllActiveBrands();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute brand counts per alphabet letter
  const letterCounts = useMemo(() => {
    const counts = { ALL: brands.length };
    ALPHABETS.slice(1).forEach((letter) => {
      counts[letter] = 0;
    });

    brands.forEach((brand) => {
      const firstChar = (brand.brand_name || "").trim().charAt(0).toUpperCase();
      if (counts[firstChar] !== undefined) {
        counts[firstChar] += 1;
      }
    });

    return counts;
  }, [brands]);

  // Filtered brands based on selected letter & optional search query
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const name = (brand.brand_name || "").trim();
      const firstChar = name.charAt(0).toUpperCase();

      const matchesLetter =
        selectedLetter === "ALL" || firstChar === selectedLetter;

      const matchesSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.trim().toLowerCase());

      return matchesLetter && matchesSearch;
    });
  }, [brands, selectedLetter, searchQuery]);

  const handleImageError = (brandId) => {
    setFailedImages((prev) => ({ ...prev, [brandId]: true }));
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-gray-800 pb-16">
      {/* ── 1. Top Breadcrumb & Header Bar (Matches Reference Image) ──────── */}
      <div className="bg-[#fdfdfd] border-b border-gray-200/90 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-gray-900 uppercase">
            ALL BRANDS - SHOP NOW
          </h1>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider"
          >
            <Link
              href="/"
              className="hover:text-[#ED1C24] transition-colors"
            >
              HOME
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800">ALL BRANDS</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ── 2. Alphabet Filter Bar & Quick Search ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Alphabet Letter Buttons */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {ALPHABETS.map((letter) => {
              const count = letterCounts[letter] || 0;
              const isSelected = selectedLetter === letter;
              const hasBrands = count > 0;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasBrands && letter !== "ALL"}
                  onClick={() => {
                    setSelectedLetter(letter);
                    setSearchQuery("");
                  }}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold uppercase rounded border transition-all duration-150 select-none ${
                    isSelected
                      ? "bg-[#ED1C24] text-white border-[#ED1C24] shadow-sm"
                      : hasBrands || letter === "ALL"
                      ? "bg-white text-gray-700 border-gray-300 hover:border-[#ED1C24] hover:text-[#ED1C24] cursor-pointer"
                      : "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-60"
                  }`}
                  title={
                    letter === "ALL"
                      ? `All Brands (${brands.length})`
                      : `${count} brand${count === 1 ? "" : "s"}`
                  }
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-64 shrink-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#ED1C24] focus:ring-1 focus:ring-[#ED1C24] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Status summary bar ───────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
          <span>
            {loading ? (
              "Loading active brands..."
            ) : (
              <>
                Showing <strong className="text-gray-800">{filteredBrands.length}</strong>{" "}
                {selectedLetter === "ALL" ? "Active" : `"${selectedLetter}"`}{" "}
                Brand{filteredBrands.length === 1 ? "" : "s"}
              </>
            )}
          </span>
          {selectedLetter !== "ALL" && (
            <button
              onClick={() => setSelectedLetter("ALL")}
              className="text-[#ED1C24] hover:underline font-medium"
            >
              Reset to All
            </button>
          )}
        </div>

        {/* ── 4. Brand Cards Grid ─────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg h-20 sm:h-22 p-3 flex items-center justify-center animate-pulse"
              >
                <div className="w-20 h-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center my-8">
            <p className="text-gray-500 text-sm mb-3">
              No active brands found matching your criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedLetter("ALL");
                setSearchQuery("");
              }}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded bg-[#ED1C24] text-white hover:bg-[#d01820] transition-colors"
            >
              View All Brands
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            {filteredBrands.map((brand) => {
              const brandSlug = brand.brand_slug || slugify(brand.brand_name);
              const brandHref = buildBrandHref(brandSlug, Boolean(brand.hasOverview));
              const imageUrl = getBrandImageUrl(brand.image);
              const hasError = failedImages[brand.id || brand.brand_name];

              return (
                <Link
                  key={brand.id || brand.brand_name}
                  href={brandHref}
                  className="bg-white border border-gray-200/90 rounded-lg p-2.5 sm:p-3 h-20 sm:h-22 flex items-center justify-center transition-all duration-200 hover:border-[#ED1C24] hover:shadow-md hover:-translate-y-0.5 cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none"
                  title={`Shop ${brand.brand_name}`}
                >
                  {imageUrl && !hasError ? (
                    <Image
                      src={imageUrl}
                      alt={brand.brand_name || "Brand Logo"}
                      width={120}
                      height={48}
                      className="max-h-12 max-w-[85%] w-auto h-auto object-contain transition-transform duration-200 group-hover:scale-105"
                      unoptimized
                      onError={() => handleImageError(brand.id || brand.brand_name)}
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-gray-800 text-center uppercase tracking-wide group-hover:text-[#ED1C24] transition-colors line-clamp-2 px-1">
                      {brand.brand_name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
