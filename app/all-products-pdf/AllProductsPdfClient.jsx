"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2, Download } from "lucide-react";
import { readStoredSession } from "@/lib/clientAuthSession";

export default function AllProductsPdfClient() {
  const searchParams = useSearchParams();

  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const verifyAdmin = async () => {
      try {
        const session = readStoredSession();
        const token =
          (typeof window !== "undefined" && localStorage.getItem("token")) || "";

        if (session?.role === "admin") {
          if (isMounted) {
            setIsAdmin(true);
            setAuthChecking(false);
          }
          return;
        }

        const res = await fetch("/api/auth/check", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data?.loggedIn && data?.role === "admin") {
          if (isMounted) {
            setIsAdmin(true);
            setAuthChecking(false);
          }
        } else {
          if (isMounted) {
            setIsAdmin(false);
            setAuthChecking(false);
            window.location.replace("/admin/login?from=/all-products-pdf");
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsAdmin(false);
          setAuthChecking(false);
          window.location.replace("/admin/login?from=/all-products-pdf");
        }
      }
    };
    verifyAdmin();
    return () => {
      isMounted = false;
    };
  }, []);

  // Read filters
  const search = searchParams.get("search") || searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || searchParams.get("Brands") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const discount = searchParams.get("discount") || "";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "50";
  const autoPrint = searchParams.get("autoprint") === "true";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", limit);
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (brand) params.set("brand", brand);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (discount) params.set("discount", discount);

      const token =
        (typeof window !== "undefined" && localStorage.getItem("token")) || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/all-products?${params.toString()}`, {
        cache: "no-store",
        headers,
      });
      const data = await res.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotalCount(data.pagination?.totalProducts || data.products?.length || 0);
      } else {
        setError(data.message || "Failed to load products");
      }
    } catch (err) {
      console.error("Error loading products for PDF:", err);
      setError("Unable to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, category, brand, minPrice, maxPrice, discount, page, limit]);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [fetchProducts, isAdmin]);

  // Auto trigger print after images load if requested
  const printTriggered = useRef(false);
  useEffect(() => {
    if (!loading && products.length > 0 && autoPrint && !printTriggered.current) {
      printTriggered.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, products, autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  // Format image url with fallback
  const resolveImage = (img) => {
    if (!img || typeof img !== "string" || img.trim() === "") {
      return "/uploads/products/placeholder.jpg";
    }
    if (img.startsWith("http")) return img;
    const clean = img.replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "");
    return `/uploads/products/${clean}`;
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
        <Loader2 className="w-10 h-10 animate-spin text-[#d72828] mb-3" />
        <p className="text-sm font-semibold tracking-wide text-gray-700">
          Verifying Admin Access...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-700 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <div className="w-12 h-12 bg-red-100 text-[#d72828] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Only</h2>
          <p className="text-xs text-gray-500 mb-6">
            PDF export is restricted to administrators only. Please log in with your admin account.
          </p>
          <a
            href="/admin/login?from=/all-products-pdf"
            className="inline-block bg-[#d72828] hover:bg-red-700 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            Sign in as Admin
          </a>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-100 print:bg-white font-sans text-gray-900 pb-12 print:pb-0">
        {/* ─── Screen-Only Toolbar (Hidden on Print) ─── */}
        <div className="no-print sticky top-0 z-40 bg-gray-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/all-products"
              className="flex items-center gap-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors text-gray-200"
            >
              <ArrowLeft size={14} />
              <span>Back to Products</span>
            </Link>
            <span className="text-xs text-gray-400 border-l border-gray-700 pl-3">
              Total: <strong className="text-white">{totalCount}</strong> products
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 bg-[#d72828] hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded text-xs tracking-wider uppercase transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer size={15} />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* ─── Printable Document Area ─── */}
          <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none print:w-full">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-[#d72828]" />
                <span className="text-sm font-semibold text-gray-600">
                  Generating PDF Preview...
                </span>
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-600 text-sm">{error}</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-xs print:border-0 print:p-0 print:shadow-none">
                  {/* Header: Sathya Logo */}
                  <div className="mb-3">
                    <div className="inline-block">
                      <Image
                        src="/uploads/sathya-header-logo.webp"
                        alt="Sathya Store"
                        width={150}
                        height={54}
                        className="h-12 w-auto object-contain"
                        priority
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* Total Products Count */}
                  <div className="mb-3">
                    <h2 className="text-sm font-extrabold text-black">
                      Total Products: {products.length}
                    </h2>
                  </div>

                  {/* Products Table (Matches PDF exactly) */}
                  <table className="w-full border-collapse border border-gray-300 text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 print:bg-gray-50 border-b border-gray-300">
                          <th className="border border-gray-300 px-3 py-2.5 font-bold text-gray-800 w-[10%]">
                            Image
                          </th>
                            <th className="border border-gray-300 px-3 py-2.5 font-bold text-gray-800 w-[14%]">
                              Item code
                            </th>
                              <th className="border border-gray-300 px-3 py-2.5 font-bold text-gray-800 w-[28%]">
                                Title
                              </th>
                                <th className="border border-gray-300 px-3 py-2.5 font-bold text-gray-800 w-[32%]">
                                  Key features
                                </th>
                                  <th className="border border-gray-300 px-2 py-2.5 font-bold text-gray-800 text-center w-[7%]">
                                    Quantity
                                  </th>
                                    <th className="border border-gray-300 px-3 py-2.5 font-bold text-gray-800 text-right w-[9%]">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {products.map((product, idx) => {
                                    const origPrice = product.price || 0;
                                    const specPrice = product.special_price || origPrice;
                                    const hasDiscount = origPrice > 0 && specPrice > 0 && specPrice < origPrice;

                                    return (
                                      <tr
                                        key={product._id || idx}
                                        className="border-b border-gray-300 break-inside-avoid page-break-inside-avoid"
                                      >
                                        {/* 1. Image */}
                                        <td className="border border-gray-300 p-2 align-top text-center">
                                          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={resolveImage(product.imgSrc)}
                                              alt={product.name}
                                              className="max-w-full max-h-full object-contain"
                                              onError={(e) => {
                                                e.currentTarget.src = "/uploads/products/placeholder.jpg";
                                              }}
                                            />
                                          </div>
                                        </td>

                                        {/* 2. Item Code */}
                                        <td className="border border-gray-300 p-2.5 align-top text-xs text-gray-700 font-medium whitespace-normal break-words">
                                          {product.item_code || product.model_number || "-"}
                                        </td>

                                        {/* 3. Title */}
                                        <td className="border border-gray-300 p-2.5 align-top">
                                          <div className="text-xs font-semibold text-gray-900 leading-snug">
                                            {product.name}
                                          </div>
                                        </td>

                                        {/* 4. Key Features Bullets */}
                                        <td className="border border-gray-300 p-2.5 align-top">
                                          {Array.isArray(product.highlights) && product.highlights.length > 0 ? (
                                            <ul className="text-[11px] text-gray-700 space-y-1 leading-tight list-none">
                                              {product.highlights.map((h, hIdx) => (
                                                <li key={hIdx} className="flex items-start gap-1">
                                                  <span className="text-gray-400 font-bold shrink-0">•</span>
                                                  <span>{h}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <span className="text-[11px] text-gray-400">-</span>
                                          )}
                                        </td>

                                        {/* 5. Quantity */}
                                        <td className="border border-gray-300 p-2.5 align-top text-center">
                                          <span className="text-sm font-semibold text-gray-800">
                                            {product.quantity ?? 1}
                                          </span>
                                        </td>

                                        {/* 6. Price */}
                                        <td className="border border-gray-300 p-2.5 align-top text-right">
                                          {hasDiscount && origPrice > 0 && (
                                            <span className="text-xs text-[#d72828] line-through font-semibold block leading-tight">
                                              ₹{origPrice.toLocaleString("en-IN")}
                                            </span>
                                          )}
                                          <span className="text-sm font-extrabold text-black block leading-snug">
                                            ₹{specPrice.toLocaleString("en-IN")}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
        )}
                          </div>

                          {/* ─── Dedicated Print CSS ─── */}
                          <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th,
          td {
            border: 1px solid #94a3b8 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
                        </div>
                        );
}

