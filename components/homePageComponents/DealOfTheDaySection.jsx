"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { isUniletProduct, isKarnatakaPincode } from "@/lib/regionHelper";
import { isMovementAllowed as checkMovementAllowed } from "@/lib/addCartConfig";
import { getAllEmiPlans, getStartingEmi } from "@/lib/emiCalculator";
import ProductAddtoCart from "@/components/ProductAddtoCart";
import AvailableInStoreNotice from "@/components/product/AvailableInStoreNotice";
import LowStockEnquiryPopup, {
  ENQUIRY_VARIANT_NORMAL,
  ENQUIRY_VARIANT_CUSORDER,
  isCusOrderMovement,
} from "@/components/LowStockEnquiryPopup";

const EmiModal = dynamic(() => import("@/components/product/EmiModal"), {
  ssr: false,
  loading: () => null,
});

function productImageSrc(product) {
  const img = product?.image || product?.images?.[0];
  if (!img) return "";
  return String(img).startsWith("http") ? img : `/uploads/products/${img}`;
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

function useCountdown(endAt, serverNow) {
  const endMs = endAt ? new Date(endAt).getTime() : 0;
  const [now, setNow] = useState(() => {
    if (serverNow) return new Date(serverNow).getTime();
    return Date.now();
  });

  useEffect(() => {
    if (!endMs) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endMs]);

  return useMemo(() => {
    const diff = Math.max(0, endMs - now);
    const totalSec = Math.floor(diff / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      expired: diff <= 0,
    };
  }, [endMs, now]);
}

/**
 * Deal of the Day — homepage-scale layout + PDP Buy Now / Add to Bag / EMI / PIN.
 */
export default function DealOfTheDaySection({ config }) {
  const product = config?.product || null;
  const countdown = useCountdown(config?.endAt, config?.serverNow);
  const router = useRouter();
  const { updateCartCount } = useCart() || {};
  const {
    pincode: regionPincode,
    userLocation,
    region: globalRegion,
    setPincode,
  } = useRegion() || {};

  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [pinOk, setPinOk] = useState(null); // null | true | false
  const [pinLoading, setPinLoading] = useState(false);
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [showLowStockEnquiry, setShowLowStockEnquiry] = useState(false);
  const [enquiryVariant, setEnquiryVariant] = useState(ENQUIRY_VARIANT_NORMAL);

  useEffect(() => {
    const initial = (regionPincode || userLocation?.pincode || "")
      .toString()
      .replace(/\D/g, "")
      .slice(0, 6);
    if (initial) setPin(initial);
  }, [regionPincode, userLocation?.pincode]);

  const dealPrice = Number(product?.dealPrice) || 0;
  const productQty = Number(product?.quantity) || 0;
  const isInStock =
    productQty > 0 &&
    String(product?.stock_status || "").toLowerCase() !== "out of stock";
  const isCusOrder = isCusOrderMovement(product?.movement);
  const isDisplayStockEnquiry =
    String(product?.display_stock || "").toLowerCase() === "yes";
  const movementOk = checkMovementAllowed(product?.movement);
  const canBuyOnline = isInStock && movementOk;

  const emiMeta = useMemo(() => {
    if (!dealPrice) return { startingEmi: null, bankCount: 0 };
    const { creditCardPlans, otherPlans, startingEmi } = getAllEmiPlans(dealPrice);
    return {
      startingEmi: startingEmi || getStartingEmi(dealPrice),
      bankCount: (creditCardPlans?.length || 0) + (otherPlans?.length || 0),
    };
  }, [dealPrice]);

  const openStockEnquiry = useCallback((variant) => {
    setEnquiryVariant(variant);
    setShowLowStockEnquiry(true);
  }, []);

  const checkDelivery = useCallback(
    async (overridePin) => {
      if (!product) return;
      const pinVal = String(overridePin ?? pin ?? "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (pinVal.length !== 6) {
        setPinOk(false);
        setPinMsg("Please enter a valid 6-digit pincode");
        return;
      }

      setPin(pinVal);
      setPinLoading(true);
      setPinMsg("");
      setPinOk(null);

      try {
        const res = await fetch(
          `/api/pincode/check-delivery?pincode=${encodeURIComponent(
            pinVal
          )}&item_code=${encodeURIComponent(
            product.item_code || ""
          )}&productId=${encodeURIComponent(product._id || "")}`
        );
        const data = await res.json().catch(() => ({}));

        const available =
          data?.status === 1 ||
          data?.deliveryAvailable === true ||
          data?.available === true ||
          data?.serviceable === true;

        const message =
          data?.deliveryMessage ||
          data?.message ||
          (available
            ? "Delivery available at your location"
            : "Not available for delivery at your location");

        setPinOk(Boolean(available));
        setPinMsg(message);

        // Persist pin in region context (no full reload on home)
        if (available && typeof setPincode === "function") {
          const current = String(regionPincode || "").trim();
          if (pinVal !== current) {
            try {
              await setPincode(pinVal);
            } catch {
              /* non-fatal */
            }
          }
        }
      } catch {
        setPinOk(false);
        setPinMsg("Unable to check delivery right now");
      } finally {
        setPinLoading(false);
      }
    },
    [pin, product, setPincode, regionPincode]
  );

  // Auto-check once when product + known pin are ready
  useEffect(() => {
    if (!product?._id) return;
    const known = String(regionPincode || userLocation?.pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (known.length === 6) {
      checkDelivery(known);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per product
  }, [product?._id]);

  const handleBuyNow = useCallback(
    async (e) => {
      if (e?.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!product) return;

      if (isCusOrder) {
        openStockEnquiry(ENQUIRY_VARIANT_CUSORDER);
        return;
      }
      if (isDisplayStockEnquiry) {
        openStockEnquiry(ENQUIRY_VARIANT_NORMAL);
        return;
      }
      if (!isInStock) {
        toast.error("This product is currently out of stock.");
        return;
      }
      if (!movementOk) {
        toast.error("Sold Out Online - Available in Store");
        return;
      }

      setBuyNowLoading(true);
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        let isLoggedIn = false;

        if (token) {
          try {
            const response = await fetch("/api/auth/check", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            const data = await response.json();
            isLoggedIn = Boolean(data.loggedIn);
          } catch (authErr) {
            console.warn("Auth check failed:", authErr);
          }
        }

        let guestCartId = null;
        if (!isLoggedIn && typeof window !== "undefined") {
          guestCartId = localStorage.getItem("guestCartId") || uuidv4();
          localStorage.setItem("guestCartId", guestCartId);
        }

        const productPrice = dealPrice;
        const effectivePincode =
          pin || regionPincode || userLocation?.pincode || "";
        const effectiveUserState =
          userLocation?.stateName ||
          userLocation?.state ||
          (globalRegion === "karnataka" ? "Karnataka" : "Tamil Nadu");
        const effectiveRegion =
          globalRegion ||
          userLocation?.region ||
          (effectiveUserState === "Karnataka" ? "karnataka" : "tamilnadu");

        const cartResponse = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isLoggedIn && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            productId: product._id,
            quantity: 1,
            selectedWarranty: 0,
            selectedExtendedWarranty: 0,
            warrantyData: null,
            ...(guestCartId && { guestCartId }),
            pincode: effectivePincode,
            userState: effectiveUserState,
            region: effectiveRegion,
          }),
        });

        if (!cartResponse.ok) {
          const errData = await cartResponse.json().catch(() => ({}));
          toast.error(errData.error || "This product is currently out of stock.");
          return;
        }

        const cartData = await cartResponse.json().catch(() => ({}));
        if (cartData?.cart?.totalItems && typeof updateCartCount === "function") {
          updateCartCount(cartData.cart.totalItems);
        }

        const isUniletOnly = Boolean(isUniletProduct(product));
        const isKarnatakaCtx = Boolean(
          isKarnatakaPincode(effectivePincode) || globalRegion === "karnataka"
        );
        const ctxVendorId =
          isKarnatakaCtx || isUniletOnly ? "unilet" : product?.vendor || "sathya";
        const ctxAssignedVendor =
          isKarnatakaCtx || isUniletOnly ? "UNILET" : "SATHYA";
        const ctxRegion = isKarnatakaCtx
          ? "karnataka"
          : globalRegion || "tamilnadu";

        const cleanMainItem = {
          _id: product._id,
          id: product._id,
          productId: product._id,
          product: product._id,
          name: product.name || "",
          title: product.name || "",
          slug: product.slug || "",
          item_code: product.item_code || "",
          price: productPrice,
          special_price: Number(product.special_price) || productPrice,
          quantity: 1,
          images: Array.isArray(product.images) ? product.images : [],
          image: product.image || product.images?.[0] || "",
          isUnilet: isUniletOnly,
          vendor: ctxVendorId,
          store_owner: ctxVendorId,
          assignedVendor: ctxAssignedVendor,
          region: ctxRegion,
          warranty: 0,
          extendedWarranty: 0,
          warrantyData: null,
          exchangeOffer: null,
        };

        sessionStorage.setItem(
          "buyNowItem",
          JSON.stringify({
            productId: product._id,
            slug: product.slug,
            title: product.name,
            price: productPrice,
            quantity: 1,
            selectedWarranty: null,
            totalAmount: productPrice,
          })
        );
        localStorage.setItem(
          "buyNowData",
          JSON.stringify({
            cart: { items: [cleanMainItem] },
            total: productPrice,
          })
        );

        if (router?.push) router.push("/checkout");
        else window.location.href = "/checkout";
      } catch (err) {
        console.error("Deal Buy Now error:", err);
        toast.error("Unable to proceed to checkout. Please try again.");
      } finally {
        setBuyNowLoading(false);
      }
    },
    [
      product,
      isCusOrder,
      isDisplayStockEnquiry,
      isInStock,
      movementOk,
      dealPrice,
      pin,
      regionPincode,
      userLocation,
      globalRegion,
      updateCartCount,
      router,
      openStockEnquiry,
    ]
  );

  if (!product || countdown.expired) return null;

  const img = productImageSrc(product);
  const specs = (config.highlightSpecs || []).filter((s) => s.label || s.value);
  const startingEmi =
    emiMeta.startingEmi || (dealPrice ? Math.ceil(dealPrice / 12) : 0);
  const tagline =
    config.tagline ||
    [product.brand, product.model_number].filter(Boolean).join(" | ");
  const scarcityQty = product.scarcityQty ?? product.quantity ?? 0;
  const rating = Number(product.star) || 0;
  const bankLabel =
    emiMeta.bankCount > 0
      ? `View ${emiMeta.bankCount} Banking Partners >`
      : "View Banking Partners >";
  const buyNowLabel = isCusOrder
    ? "Order Now"
    : config.primaryCtaLabel || "Buy Now with Express Delivery";
  const emiDetailLine =
    config.emiHint ||
    (startingEmi
      ? `Starting at ${formatMoney(startingEmi)}/mo for 12 months with 0% interest`
      : "");

  return (
    <section className="w-full mb-8 md:mb-10 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
        {/* Header — matches mock + home section scale */}
        <div className="flex flex-col gap-3 bg-[#1A1A1A] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ED1C24]">
              <Icon icon="mdi:timer-outline" className="text-lg text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-bold uppercase tracking-[0.06em] text-white">
                  {config.eyebrow || "DEAL OF THE DAY"}
                </span>
                {config.badgeLabel ? (
                  <span className="rounded-full bg-[#F5C518] px-2.5 py-0.5 text-[11px] font-bold text-black">
                    {config.badgeLabel}
                  </span>
                ) : null}
              </div>
              {config.bannerSubtitle ? (
                <p className="mt-1 text-xs sm:text-[13px] leading-snug text-white/70 line-clamp-2 max-w-2xl">
                  {config.bannerSubtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
              Ends in:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-base sm:text-xl font-bold tabular-nums text-white">
              <span className="min-w-[2rem] rounded-md bg-black px-2 py-1 text-center">
                {countdown.hours}
              </span>
              <span className="text-white/70">:</span>
              <span className="min-w-[2rem] rounded-md bg-black px-2 py-1 text-center">
                {countdown.minutes}
              </span>
              <span className="text-white/70">:</span>
              <span className="min-w-[2rem] rounded-md bg-[#ED1C24] px-2 py-1 text-center">
                {countdown.seconds}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:p-6 lg:grid-cols-2 lg:gap-8">
          {/* Image */}
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] sm:aspect-square lg:aspect-[5/4]">
              {product.saveAmount > 0 ? (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-[#ED1C24] px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                  Save {formatMoney(product.saveAmount)} Today
                </div>
              ) : null}
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt={product.name}
                  className="h-full w-full object-contain p-5 sm:p-8"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <Icon icon="mdi:image-off" className="text-4xl" />
                </div>
              )}
            </div>

            {specs.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                {specs.slice(0, 3).map((spec, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-gray-100 px-2 py-2.5 sm:px-3 sm:py-3 text-center"
                  >
                    <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      {spec.label}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                      {spec.value || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Details */}
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              {tagline ? (
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {tagline}
                </p>
              ) : (
                <span />
              )}
              {config.showScarcity ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ED1C24] px-2.5 py-1 text-[11px] font-bold text-white">
                  <Icon icon="mdi:fire" className="text-sm" />
                  {config.scarcityLabel || "High Demand"}: {scarcityQty} Left
                </span>
              ) : null}
            </div>

            <h3 className="mt-2 text-[18px] sm:text-[22px] md:text-[26px] font-extrabold leading-snug text-gray-900">
              {product.name}
            </h3>

            {rating > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] sm:text-[13px] text-gray-600">
                <div className="flex items-center gap-0.5 text-[#F5B800]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Icon
                      key={i}
                      icon={
                        i <= Math.round(rating) ? "mdi:star" : "mdi:star-outline"
                      }
                      className="text-[14px]"
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">
                  {rating.toFixed(1)} / 5
                </span>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-end gap-2 sm:gap-3">
              <span className="text-[26px] sm:text-[32px] md:text-[36px] font-extrabold leading-none text-[#ED1C24]">
                {formatMoney(dealPrice)}
              </span>
              {product.mrp > dealPrice ? (
                <span className="pb-1 text-base sm:text-lg text-gray-400 line-through">
                  {formatMoney(product.mrp)}
                </span>
              ) : null}
              {product.saveAmount > 0 ? (
                <span className="mb-0.5 inline-flex rounded-md bg-[#F5C518] px-2.5 py-1 text-[12px] sm:text-[13px] font-bold text-black">
                  Save {formatMoney(product.saveAmount)} ({product.savePercent}% Off)
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[12px] text-gray-500">
              Inclusive of all GST &amp; import levies
            </p>

            {/* PIN check */}
            <div className="mt-4 rounded-xl bg-gray-100 p-3 sm:p-3.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon
                    icon="mdi:truck-fast"
                    className="mt-0.5 shrink-0 text-xl text-[#ED1C24]"
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-gray-900">
                      Check Instant Postal Delivery
                    </div>
                    <div className="text-[12px] text-gray-500 leading-snug">
                      {config.deliveryHint ||
                        "Enter PIN code for delivery by 9 PM Today"}
                    </div>
                  </div>
                </div>
                <form
                  className="flex items-center gap-2 shrink-0"
                  onSubmit={(e) => {
                    e.preventDefault();
                    checkDelivery();
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setPinOk(null);
                      setPinMsg("");
                    }}
                    placeholder="600002"
                    className="w-[100px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={pinLoading}
                    className="rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {pinLoading ? "…" : "Check"}
                  </button>
                </form>
              </div>
              {pinMsg ? (
                <p
                  className={`mt-2 pl-8 text-[12px] font-medium ${
                    pinOk === true
                      ? "text-emerald-600"
                      : pinOk === false
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  {pinMsg}
                </p>
              ) : null}
            </div>

            {/* EMI */}
            <div className="mt-3 rounded-xl bg-gray-100 p-3 sm:p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon
                    icon="mdi:credit-card"
                    className="mt-0.5 shrink-0 text-xl text-[#F5C518]"
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-gray-900">
                      No Cost EMI Available
                    </div>
                    <div className="text-[12px] text-gray-500 leading-snug">
                      {emiDetailLine}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmiModalOpen(true)}
                  className="shrink-0 text-left text-[12px] sm:text-[13px] font-semibold text-[#ED1C24] hover:underline whitespace-nowrap"
                >
                  {bankLabel}
                </button>
              </div>
            </div>

            {/* CTAs */}
            {!isInStock ? (
              <AvailableInStoreNotice variant="panel" className="mt-4" />
            ) : (
              <>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={
                  buyNowLoading ||
                  (!canBuyOnline && !isCusOrder && !isDisplayStockEnquiry)
                }
                className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#ED1C24] px-5 py-3 text-[14px] sm:text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(237,28,36,0.25)] hover:bg-[#d01920] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon icon="mdi:flash" className="text-lg" />
                {buyNowLoading ? "Processing…" : buyNowLabel}
              </button>

              <div className="flex-1 sm:max-w-[200px] [&_button]:!h-[48px] [&_button]:!rounded-xl [&_button]:!text-[14px]">
                <ProductAddtoCart
                  productId={product._id}
                  quantity={1}
                  special_price={dealPrice}
                  stockQuantity={productQty}
                  display_stock={product.display_stock}
                  movement={product.movement}
                  productName={product.name}
                  productSlug={product.slug}
                  buttonLabel={config.secondaryCtaLabel || "Add to Bag"}
                  buttonClassName="w-full !rounded-xl !border !border-gray-300 !bg-white !text-gray-900 !font-bold hover:!bg-gray-50 hover:!text-gray-900"
                />
              </div>
            </div>

            {!canBuyOnline && !isCusOrder && !isDisplayStockEnquiry ? (
              <p className="mt-2 text-[12px] text-amber-700">
                Sold out online — available in store.
              </p>
            ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <EmiModal
        isOpen={isEmiModalOpen}
        onClose={() => setIsEmiModalOpen(false)}
        price={dealPrice}
        productName={product?.name}
      />

      {showLowStockEnquiry && (
        <LowStockEnquiryPopup
          onClose={() => setShowLowStockEnquiry(false)}
          productName={product?.name}
          productSlug={product?.slug}
          stockQuantity={productQty}
          variant={enquiryVariant}
        />
      )}
    </section>
  );
}
