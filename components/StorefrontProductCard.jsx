"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AddToWishlistButton from "@/components/ProductCard";
import ProductAddtoCart from "@/components/AddToCart";
import CompareButton from "@/components/CompareButton";
import PriceBlock from "@/components/product/PriceBlock";
import BestPriceStrip from "@/components/product/BestPriceStrip";
import ProductCardTrustBadge from "@/components/product/ProductCardTrustBadge";
import LowestPriceBadge from "@/components/product/LowestPriceBadge";
import { getBestPriceData } from "@/lib/offers/bestPriceUtils";
import { BankOffersModal } from "@/components/ProductOffersSection";
import { getDiscountInfo } from "@/lib/discountHelper";
import { isMovementAllowed as checkMovementAllowed } from "@/lib/addCartConfig";

export default function StorefrontProductCard({
  product,
  brandMap = {},
  onProductClick,
  className = "",
  compactMobile = true,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!product) return null;

  const { discountPercent, showDiscount } = getDiscountInfo(product.price, product.special_price);
  const hasDiscount = showDiscount;

  const currentPrice = hasDiscount ? product.special_price : product.price || 0;
  const originalPrice = product.price || 0;

  const brandId = product.brand?._id || (typeof product.brand === "string" ? product.brand : null);
  const resolvedBrandMap = brandId && brandMap[brandId] ? brandMap[brandId] : "";

  let brandName =
    product.brand?.name ||
    product.brand?.brand_name ||
    product.brand_name ||
    resolvedBrandMap ||
    (typeof product.brand === "string" && !/^[0-9a-fA-F]{24}$/.test(product.brand) && product.brand.toUpperCase() !== "SATHYA" ? product.brand : "") ||
    (product.brandName && product.brandName.toUpperCase() !== "SATHYA" ? product.brandName : "") ||
    product.manufacturer_name ||
    "";

  if (!brandName && product.name) {
    const firstWord = product.name.trim().split(/\s+/)[0];
    const matchedBrand = Object.values(brandMap).find(
      (b) => b && b.toLowerCase() === firstWord.toLowerCase()
    );
    if (matchedBrand) {
      brandName = matchedBrand;
    } else if (/^windzy/i.test(product.name)) {
      brandName = "WINDZY";
    } else if (/^acer/i.test(product.name)) {
      brandName = "Acer";
    }
  }

  const rawQty = product?.quantity ?? product?.stock;
  const rawStatus = String(product?.stock_status || "").trim();
  const hasExplicitQty = rawQty !== undefined && rawQty !== null;
  // Safe Fallback: If quantity was omitted from projection but product is flagged In Stock, treat as 10 units so it's not falsely marked Out of Stock.
  const qty = hasExplicitQty
    ? Number(rawQty)
    : (rawStatus === "In Stock" || rawStatus === "instock" ? 10 : 0);
  const isOutOfStock = qty <= 0 || rawStatus === "Out of Stock" || rawStatus === "outofstock";
  const isInStock = !isOutOfStock && qty > 0;
  const inStock = isInStock;
  const isOnlineInStock = isInStock && qty >= 10;
  const isStoreOnly = isInStock && qty > 0 && qty < 10;

  const ratingValue = Number(
    product.avgRating || product.rating || product.average_rating || 0
  );
  const reviewCount = Number(
    product.reviewCount || product.reviews_count || product.numReviews || 0
  );

  const validImage = Array.isArray(product.images)
    ? product.images.find(img => img && typeof img === "string" && img.trim() !== "" && img.trim().toLowerCase() !== "null" && img.trim().toLowerCase() !== "undefined")
    : (typeof product.images === "string" && product.images.trim() ? product.images : null);

  const imagepathname = validImage || product.imgSrc || product.image || "";
  const initialImgSrc = imagepathname
    ? (imagepathname.startsWith("http")
        ? imagepathname
        : `/uploads/products/${imagepathname.replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "")}`)
    : "/uploads/products/placeholder.jpg";

  const [currentImg, setCurrentImg] = useState(initialImgSrc);
  const [retryFailed, setRetryFailed] = useState(false);

  React.useEffect(() => {
    setCurrentImg(initialImgSrc);
    setRetryFailed(false);
    setImgLoaded(false);
  }, [initialImgSrc]);

  const assetFallbackBase = (process.env.NEXT_PUBLIC_ASSET_FALLBACK_URL || "https://estore.bharathelectronics.in").replace(/\/+$/, "");

  const handleImageError = () => {
    setImgLoaded(true);
    if (!retryFailed && currentImg && currentImg.startsWith("/uploads/products/") && !currentImg.includes("placeholder")) {
      const filename = currentImg.replace("/uploads/products/", "");
      setRetryFailed(true);
      setCurrentImg(`${assetFallbackBase}/uploads/products/${filename}`);
    } else {
      setRetryFailed(true);
      setCurrentImg("/uploads/products/placeholder.jpg");
    }
  };

  const productUrl = `/product/${product.slug || product._id}`;

  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const bestPriceData = React.useMemo(() => getBestPriceData(product), [product]);

  // Detect LSP for special card border
  const rawLspSf = product?.lsp ?? product?.rawProduct?.lsp;
  const lspNumSf = Number(rawLspSf);
  const hasLsp = Boolean((lspNumSf && !isNaN(lspNumSf) && lspNumSf > 0) || product?.hasLspPrice);

  const handleClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-[16px] border hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden w-full min-w-0 select-none ${
        hasLsp
          ? "lsp-card shadow-sm hover:shadow-xl"
          : "border-red-200/90 hover:border-[#d72828] shadow-2xs hover:shadow-xl"
      } ${className}`}
    >
      {/* Top-left Lowest Price Badge (conditional on product.lsp > 0) */}
      <LowestPriceBadge product={product} variant="card" />

      {/* Top Image Container */}
      <div
        className={`relative w-full bg-[#f9fafb] flex items-center justify-center overflow-hidden ${
          compactMobile ? "h-[120px] sm:h-[170px] p-2 sm:p-3" : "h-[150px] sm:h-[170px] p-3"
        }`}
      >

        {/* Top-right Wishlist + Compare buttons */}
        <div
          className={`absolute z-10 flex flex-col ${
            compactMobile
              ? "top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 gap-1 sm:gap-1.5"
              : "top-2.5 right-2.5 gap-1.5"
          }`}
        >
          <AddToWishlistButton
            productId={product._id}
            iconSize={compactMobile ? 12 : 14}
            className={`${
              compactMobile ? "w-6 h-6 sm:w-7 sm:h-7" : "w-7 h-7"
            } rounded-full bg-white/90 backdrop-blur-md shadow-xs border border-gray-100 flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all text-gray-600 hover:text-rose-600`}
          />
          <CompareButton
            product={product}
            variant="icon"
            className={`${
              compactMobile ? "w-6 h-6 sm:w-7 sm:h-7" : "w-7 h-7"
            } rounded-full bg-white/90 backdrop-blur-md shadow-xs border flex items-center justify-center transition-all active:scale-95`}
          />
        </div>

        <Link
          href={productUrl}
          onClick={handleClick}
          className="relative w-full h-full flex items-center justify-center"
        >
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gray-100/60 animate-pulse rounded-lg" />
          )}
          <Image
            src={currentImg}
            alt={product.name || "Product Image"}
            fill
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 20vw"
            className={`object-contain p-2 group-hover:scale-105 transition-transform duration-300 ease-out ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={handleImageError}
            unoptimized
          />
        </Link>
      </div>

      {/* Content Area */}
      <div
        className={`flex flex-col flex-1 bg-white ${
          compactMobile ? "p-2 sm:p-4" : "p-3 sm:p-4"
        }`}
      >
        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate mb-1 block">
          {brandName || ""}
        </span>

        <Link href={productUrl} onClick={handleClick} className="block mb-1 sm:mb-1.5">
          <h4
            title={product.name}
            className={`font-semibold text-gray-900 group-hover:text-[#d72828] transition-colors leading-snug line-clamp-3 sm:line-clamp-2 ${
              compactMobile
                ? "text-[12px] sm:text-sm min-h-[3.15rem] sm:min-h-0 sm:h-[2.4rem]"
                : "text-xs sm:text-sm h-[2.4rem]"
            }`}
          >
            {product.name}
          </h4>
        </Link>

        <PriceBlock 
          price={currentPrice} 
          mrp={originalPrice} 
          priceClass={compactMobile ? "text-[13px] sm:text-base" : "text-sm sm:text-base"}
        />

        {/* Stock Row */}
        <div className="flex items-center gap-1 mt-0.5 mb-1.5">
          {isStoreOnly ? (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-amber-700">
                Sold Out Online
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70 flex-shrink-0">
                In Store
              </span>
            </>
          ) : isOnlineInStock ? (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium text-emerald-600">
                In Stock
              </span>
            </>
          ) : (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium text-rose-600">
                Out of Stock
              </span>
            </>
          )}
        </div>

        <div
          className={`mt-auto ${
            compactMobile ? "pt-1.5 sm:pt-2 gap-1.5 sm:gap-2" : "pt-2 gap-2"
          } border-t border-gray-100 flex flex-col`}
        >
          {isStoreOnly ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className={`w-full text-xs font-bold bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-none select-none ${
                compactMobile
                  ? "!py-0 !mr-0 h-[32px] sm:h-auto min-h-[32px] whitespace-nowrap"
                  : "py-1.5 min-h-[32px]"
              }`}
              title="Sold Out Online - Available in Store"
            >
              <span>Sold Out Online</span>
            </button>
          ) : (
            <ProductAddtoCart
              productId={product._id}
              stockQuantity={qty}
              special_price={product.special_price}
              className={
                compactMobile
                  ? "w-full text-xs font-bold !py-0 !mr-0 h-[32px] sm:h-auto min-h-[32px] rounded-xl transition-all shadow-2xs flex items-center justify-center whitespace-nowrap"
                  : "w-full text-xs font-bold py-1.5 rounded-xl transition-all shadow-2xs"
              }
              movement={product.movement}
              productName={product.name}
              productSlug={product.slug}
              checkMovement={true}
            />
          )}

          {bestPriceData ? (
            <BestPriceStrip 
              effectivePrice={bestPriceData.bestPrice} 
              onOffersClick={() => setIsOffersModalOpen(true)}
              compact={compactMobile}
            />
          ) : null}
        </div>
      </div>

      {isOffersModalOpen && bestPriceData && (
        <BankOffersModal
          basePrice={bestPriceData.basePrice}
          bankOffers={bestPriceData.bankOffers}
          bankEffectivePrice={bestPriceData.bestPrice}
          onClose={() => setIsOffersModalOpen(false)}
        />
      )}
    </div>
  );
}
