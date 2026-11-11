'use client';


import dynamic from "next/dynamic";

const ProductDetailsSection = dynamic(() => import("@/components/ProductDetailsSection"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-gray-100 rounded-lg my-6" />,
});
import OfferRibbonBadge from "@/components/OfferRibbonBadge";

const FlixMediaLoader = dynamic(() => import("@/components/FlixMediaLoader"), {
  ssr: false,
  loading: () => null,
});
import ProductSkeleton from "@/components/ProductSkeleton";
import ProductVariantSelector from "@/components/ProductVariantSelector";
import ExchangeOfferSection from "@/components/ExchangeOfferSection";
// import RelatedProducts from "@/components/RelatedProducts";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";

import { ShieldHalf } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { FaStore, FaPhoneAlt } from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
import { FaShoppingCart, FaHeart, FaShareAlt, FaRupeeSign, FaCartPlus, FaBell } from "react-icons/fa";
import { isOpenBoxEligible, CLEARANCE_PHONE } from "@/lib/openBoxHelper";
import { FiShoppingCart } from "react-icons/fi";
import { TbTruckDelivery } from "react-icons/tb";
import { IoFastFoodOutline, IoReload, IoCardOutline, IoShieldCheckmark, IoStorefront, IoLocationOutline } from "react-icons/io5";
import Link from "next/link";
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';
import { useRegion } from '@/context/RegionContext';
import { isUniletProduct, isKarnatakaPincode } from '@/lib/regionHelper';
import { toast } from 'react-toastify';
import ProductCard from "@/components/ProductCard";
import ProductAddtoCart from "@/components/ProductAddtoCart"
import LowStockEnquiryPopup, {
  ENQUIRY_VARIANT_NORMAL,
  ENQUIRY_VARIANT_CUSORDER,
  isCusOrderMovement,
} from "@/components/LowStockEnquiryPopup";
import AddToWishlistButton from "@/components/ProductCard";

import ProductBreadcrumb from "@/components/ProductBreadcrumb";
const RecentlyViewedProducts = dynamic(() => import("@/components/RecentlyViewedProducts"), {
  ssr: false,
  loading: () => null,
});
const RelatedProducts = dynamic(() => import("@/components/RelatedProducts"), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse bg-gray-100 rounded-lg my-6" />,
});
import PaymentOffers from "@/components/product/PaymentOffers";
const CompetitorPriceTracker = dynamic(() => import("@/components/CompetitorPriceTracker"), {
  ssr: false,
  loading: () => null,
});
const ProductInstallationWarrantySection = dynamic(
  () => import("@/components/ProductInstallationWarrantySection"),
  { ssr: false, loading: () => null }
);
const ShareModal = dynamic(() => import("@/components/ShareModal"), {
  ssr: false,
  loading: () => null,
});
import CompareButton from "@/components/CompareButton";
const EmiModal = dynamic(() => import("@/components/product/EmiModal"), {
  ssr: false,
  loading: () => null,
});
import { useCompare } from "@/context/CompareContext";
import WarrantyBadge from "@/components/WarrantyBadge";
import BestPriceStrip from "@/components/product/BestPriceStrip";
import { getBestPrice } from "@/lib/offers/bestPriceUtils";
import { isExtendedWarrantyEligible } from "@/lib/productServiceEligibility";
import { isMovementAllowed as checkMovementAllowed } from "@/lib/addCartConfig";
import { v4 as uuidv4 } from "uuid";
import { getDiscountInfo } from "@/lib/discountHelper";


function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <span className="text-sm text-gray-700 pr-4">{question}</span>
        <span className={`text-gray-400 text-xl transition-transform duration-200 flex-shrink-0 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-500 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}



// FlixMedia moves #flix-minisite in the DOM itself. If React owns that node,
// unmounting it on a mobile/desktop switch throws:
// "Failed to execute 'removeChild' on 'Node'".
// React only owns this wrapper; the Flix container inside is plain HTML.
function FlixMinisiteSlot() {
  useEffect(() => {
    return () => {
      document.querySelectorAll("#flix-minisite").forEach((node) => {
        if (!node.closest("[data-flix-slot]")) node.remove();
      });
    };
  }, []);

  return (
    <div
      data-flix-slot
      className="w-full"
      dangerouslySetInnerHTML={{
        __html: '<div id="flix-minisite" class="flix-minisite-container w-full"></div>',
      }}
    />
  );
}

function ThumbnailStrip({ images, selectedImageIndex, onSelect, resolveImagePath, onError }) {
  const stripRef = useRef(null);
  const [scroll, setScroll] = useState({ left: false, right: false });

  const updateScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    // Hidden layout (mobile/desktop twin) has no width — don't measure or scroll it.
    if (el.clientWidth === 0) {
      setScroll({ left: false, right: false });
      return;
    }
    setScroll({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    updateScroll();
    window.addEventListener("resize", updateScroll);
    return () => window.removeEventListener("resize", updateScroll);
  }, [images, updateScroll]);

  useEffect(() => {
    const el = stripRef.current;
    const thumb = el?.children?.[selectedImageIndex];
    if (!el || !thumb || el.clientWidth === 0) return;
    const thumbLeft = thumb.offsetLeft;
    if (thumbLeft < el.scrollLeft) {
      el.scrollTo({ left: thumbLeft - 4, behavior: "smooth" });
    } else if (thumbLeft + thumb.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: thumbLeft + thumb.offsetWidth - el.clientWidth + 4, behavior: "smooth" });
    }
  }, [selectedImageIndex]);

  const scrollBy = (direction) => {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const validImages = (images || []).filter(
    (img) => img && typeof img === "string" && img.trim() !== ""
  );
  if (!validImages.length) return null;

  const arrowClass =
    "flex-shrink-0 w-6 h-14 sm:w-7 sm:h-16 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm hover:border-[#d72828] hover:text-[#d72828] transition-colors";

  return (
    <div className="relative flex items-center gap-1 w-full min-w-0 mt-3 lg:mt-0">
      {scroll.left && (
        <button type="button" aria-label="Previous images" onClick={() => scrollBy(-1)} className={arrowClass}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div
        ref={stripRef}
        onScroll={updateScroll}
        className="relative flex flex-1 min-w-0 gap-2 overflow-x-auto p-1 scrollbar-hide scroll-smooth"
      >
        {validImages.map((image, index) => (
          <button
            type="button"
            key={index}
            onClick={() => onSelect(index)}
            aria-label={`Show image ${index + 1}`}
            className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white p-1 border-2 transition-all duration-200 ${selectedImageIndex === index
              ? "border-[#d72828] shadow-md"
              : "border-gray-200 opacity-75 hover:opacity-100 hover:border-gray-400"
              }`}
          >
            <img
              src={resolveImagePath(image)}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => onError(e, image)}
            />
          </button>
        ))}
      </div>
      {scroll.right && (
        <button type="button" aria-label="Next images" onClick={() => scrollBy(1)} className={arrowClass}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

let sharedBrandPromise = null;
const getSharedBrandData = () => {
  if (!sharedBrandPromise) {
    sharedBrandPromise = fetch("/api/brand")
      .then((res) => res.json())
      .catch((err) => {
        sharedBrandPromise = null;
        throw err;
      });
  }
  return sharedBrandPromise;
};

export default function ProductClient({ initialProduct = null, lspPdpEnabled = false }) {
  const router = useRouter();
  const params = useParams();
  const slug = params?.sub_slug_one || params?.slug;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [slug]);

  const [relatedProductsLoading, setRelatedProductsLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [brand, setBrand] = useState([]);
  const [selectedRelatedProducts, setSelectedRelatedProducts] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const variantCacheRef = useRef({});
  const productRef = useRef(initialProduct);
  const applyingVariantRef = useRef(false);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showLowStockEnquiry, setShowLowStockEnquiry] = useState(false);
  const [enquiryVariant, setEnquiryVariant] = useState(ENQUIRY_VARIANT_NORMAL);
  const [showEMIModal, setShowEMIModal] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedWarrantyAmount, setSelectedWarrantyAmount] = useState(0);
  const [showNoWarrantyModal, setShowNoWarrantyModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [notifyMeSuccess, setNotifyMeSuccess] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [flixInpageAvailable, setFlixInpageAvailable] = useState(null);
  const handleFlixInpage = useCallback(() => setFlixInpageAvailable(true), []);
  const handleFlixNoshow = useCallback(() => setFlixInpageAvailable(false), []);
  const [addOnProducts, setAddOnProducts] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [selectedWarrantyData, setSelectedWarrantyData] = useState(null);
  const { pincode: globalPincode, region: globalRegion, userLocation, isInitialized, setPincode } = useRegion();
  const variantKey = (id) => `${globalRegion || "tamilnadu"}::${id}`;
  productRef.current = product;

  const effectivePincode = useMemo(() => {
    return (globalPincode || userLocation?.pincode || "").toString().replace(/\D/g, "").trim();
  }, [globalPincode, userLocation?.pincode]);

  const effectiveUserState = useMemo(() => {
    return userLocation?.stateName || userLocation?.state || (globalRegion === "karnataka" ? "Karnataka" : "Tamil Nadu");
  }, [userLocation?.stateName, userLocation?.state, globalRegion]);

  // Pincode / region change → full page reload (SSR + all PDP sections).
  // Do not partially refresh stock/price/delivery in place.
  const locationKeyRef = useRef(null);
  useEffect(() => {
    if (!isInitialized) return;
    const key = `${effectivePincode}|${globalRegion || ""}`;
    if (locationKeyRef.current === null) {
      locationKeyRef.current = key;
      return;
    }
    if (locationKeyRef.current === key) return;
    window.location.reload();
  }, [effectivePincode, globalRegion, isInitialized]);

  const [highlightOffer, setHighlightOffer] = useState(null);
  const [hasExchangeOffers, setHasExchangeOffers] = useState(false);
  const [appliedExchangeOffer, setAppliedExchangeOffer] = useState(null);
  const [hasPaymentOffers, setHasPaymentOffers] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  const { setSimilarProducts } = useCompare();

  // Exist PDP: Unilet-on → catalog/Unilet special already on product; else LSP→special→MRP
  // (server resolveProductPrice remaps special_price when using LSP; Unilet path skips LSP).
  // Exist related-card priority: LSP → special → MRP (skip LSP when Unilet price applied)
  const resolveItemSellingPrice = useCallback((p) => {
    if (!p) return 0;
    if (!p.isUnilet && Number(p.lsp) > 0) return Number(p.lsp);
    if (Number(p.special_price) > 0) return Number(p.special_price);
    return Number(p.price) || 0;
  }, []);

  const usingLspPrice = Boolean(product?.usingLsp) && !Boolean(product?.isUnilet);
  const displaySellingPrice = useMemo(() => {
    if (usingLspPrice && Number(product?.lsp) > 0) return Number(product.lsp);
    // special_price already remapped to LSP by resolveProductPrice when usingLsp
    if (Number(product?.special_price) > 0) return Number(product.special_price);
    return Number(product?.price) || 0;
  }, [usingLspPrice, product?.lsp, product?.special_price, product?.price]);

  const effectivePrice = useMemo(() => {
    const warranty = isExtendedWarrantyEligible(product) ? (selectedWarrantyAmount || 0) : 0;
    return Number(displaySellingPrice + warranty);
  }, [displaySellingPrice, selectedWarrantyAmount, product]);

  const mainDiscountInfo = useMemo(
    () => getDiscountInfo(product?.price, displaySellingPrice),
    [product?.price, displaySellingPrice]
  );

  const currentVariantValues = useMemo(() => {
    if (!product) return null;
    let values = {};
    if (product.variantGroup?.products?.length && product.variantGroup?.attributes?.length) {
      const match = product.variantGroup.products.find(
        (p) => p && String(p._id) === String(product._id)
      );
      if (match?.values && typeof match.values === "object") {
        for (const [k, v] of Object.entries(match.values)) {
          if (v != null && String(v).trim() !== "") {
            values[k] = typeof v === "object" ? (v.label || v.value || JSON.stringify(v)) : String(v).trim();
          }
        }
      }
    }
    // Also check direct product fields if not already populated
    if (!values.Color && product.color) values.Color = product.color;
    if (!values.Size && product.size) values.Size = product.size;
    if (!values.Capacity && product.capacity) values.Capacity = product.capacity;
    return Object.keys(values).length > 0 ? values : null;
  }, [product]);

  const currentColor = useMemo(() => {
    if (currentVariantValues?.Color) return currentVariantValues.Color;
    if (currentVariantValues?.color) return currentVariantValues.color;
    if (product?.color) return product.color;
    return "";
  }, [currentVariantValues, product?.color]);

  // Sync related products to compare context for similar product recommendations
  useEffect(() => {
    if (relatedProducts && relatedProducts.length > 0) {
      setSimilarProducts(relatedProducts);
    } else if (product?.related_products && product.related_products.length > 0) {
      setSimilarProducts(product.related_products);
    }
  }, [relatedProducts, product?.related_products, setSimilarProducts]);

  useEffect(() => {
    setHighlightOffer(null);

    if (!product?._id) {
      return;
    }

    // Wait until RegionContext initializes from localStorage/cookie to prevent wrong-state flash
    if (typeof isInitialized !== "undefined" && !isInitialized) {
      return;
    }

    // Missing / unknown state -> ribbon hidden
    if (!globalRegion || typeof globalRegion !== "string" || !globalRegion.trim()) {
      setHighlightOffer(null);
      return;
    }

    const currentRegion = globalRegion.trim();
    let active = true;

    const fetchHighlightOffer = async () => {
      try {
        const res = await fetch(
          `/api/highlighted-offer/check-product?productId=${encodeURIComponent(product._id)}&state=${encodeURIComponent(currentRegion)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (active) setHighlightOffer(null);
          return;
        }
        const data = await res.json();
        if (active) {
          if (data?.hasOffer && (data?.labelText || data?.offerName)) {
            setHighlightOffer({
              offerName: data.offerName,
              labelText: data.labelText,
              labelColor: data.labelColor,
            });
          } else {
            setHighlightOffer(null);
          }
        }
      } catch (err) {
        console.error("Error checking highlighted offer:", err);
        if (active) setHighlightOffer(null);
      }
    };

    fetchHighlightOffer();

    return () => {
      active = false;
    };
  }, [product?._id, globalRegion, isInitialized]);

  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [isEditingPincode, setIsEditingPincode] = useState(false);
  const deliveryRequestIdRef = useRef(0);

  useEffect(() => {
    if (globalPincode) {
      setDeliveryPincode(globalPincode);
    }
  }, [globalPincode]);

  const handleCheckDelivery = async (pin) => {
    const pinVal = (pin || deliveryPincode || globalPincode || "600001").toString().trim();
    if (!pinVal || pinVal.length !== 6 || !/^\d{6}$/.test(pinVal)) {
      setDeliveryInfo({
        status: 0,
        available: false,
        serviceable: false,
        deliveryAvailable: false,
        isInvalidPincode: true,
        message: "Please enter a valid 6-digit pincode",
        deliveryMessage: "Please enter a valid 6-digit pincode",
        pickupAvailable: false,
        pickupMessage: "Not Available",
      });
      return;
    }

    setDeliveryPincode(pinVal);
    const reqId = ++deliveryRequestIdRef.current;
    try {
      setIsCheckingDelivery(true);
      // Immediately reset delivery result so previous state does not linger
      setDeliveryInfo(null);
      const res = await fetch(
        `/api/pincode/check-delivery?pincode=${pinVal}&item_code=${product?.item_code || ""}&productId=${product?._id || ""}`
      );
      if (!res.ok) {
        let errData = null;
        try {
          errData = await res.json();
        } catch {}
        if (reqId === deliveryRequestIdRef.current) {
          setDeliveryInfo({
            status: 0,
            available: false,
            serviceable: false,
            deliveryAvailable: false,
            isError: true,
            message: errData?.message || "Unable to check delivery right now",
            deliveryMessage: errData?.message || "Unable to check delivery right now",
            pickupAvailable: false,
            pickupMessage: "Not Available",
          });
        }
        return;
      }

      const data = await res.json();
      if (reqId === deliveryRequestIdRef.current) {
        setDeliveryInfo(data);
      }
    } catch (e) {
      console.error("Delivery check error:", e);
      if (reqId === deliveryRequestIdRef.current) {
        setDeliveryInfo({
          status: 0,
          available: false,
          serviceable: false,
          deliveryAvailable: false,
          isError: true,
          message: "Network error. Please try again.",
          deliveryMessage: "Network error. Please try again.",
          pickupAvailable: false,
          pickupMessage: "Not Available",
        });
      }
    } finally {
      if (reqId === deliveryRequestIdRef.current) {
        setIsCheckingDelivery(false);
      }
    }
  };

  const handlePincodeSubmit = async (event) => {
    event.preventDefault();
    const pinVal = String(deliveryPincode || "").replace(/\D/g, "").slice(0, 6);
    setIsEditingPincode(false);

    if (!/^\d{6}$/.test(pinVal)) {
      handleCheckDelivery(pinVal);
      return;
    }

    const currentPin = String(globalPincode || "").trim();
    if (pinVal === currentPin) {
      handleCheckDelivery(pinVal);
      return;
    }

    // Persist pin then full reload so entire PDP matches new location
    const updated = await setPincode(pinVal);
    if (updated) {
      window.location.reload();
      return;
    }
    handleCheckDelivery(pinVal);
  };

  // Initial delivery check only — pincode changes reload the page
  useEffect(() => {
    if (!product?._id || !isInitialized) return;
    const headerPin = String(globalPincode || "").trim();
    if (headerPin) setDeliveryPincode(headerPin);
    handleCheckDelivery(headerPin || "600001");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id, product?.item_code, isInitialized]);

  const outlineActionBtnClass =
    "flex items-center justify-center gap-2 border border-gray-300 rounded-md bg-white px-4 py-2 text-sm font-medium text-[#d72828] hover:border-red-400 hover:bg-red-50 transition-colors whitespace-nowrap";
  const addToCartOutlineClass =
    "w-full border border-gray-300 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-[#d72828] hover:border-red-400 hover:bg-red-50 transition-colors shadow-none";

  const productQty = Number(product?.quantity ?? product?.stock ?? 0);
  const rawStockStatus = String(product?.stock_status || (productQty > 0 ? "In Stock" : "")).trim();
  const isOutOfStockStatus = productQty <= 0 || rawStockStatus === "Out of Stock" || rawStockStatus === "outofstock";
  const isInStock = !isOutOfStockStatus && productQty > 0;
  // Do not use quantity < 10 for Sold Out Online — movement whitelist only
  // (retail-only movements e.g. NON ROL). display_stock gates enquiry separately.
  const isMovementAllowed = isInStock && checkMovementAllowed(product?.movement);
  const isOnlineAvailable = isMovementAllowed;
  const isCusOrder = isCusOrderMovement(product?.movement);
  // Exist: display_stock == 'yes' → normal enquiry; CUS-Order → cusorder modal
  const isDisplayStockEnquiry = String(product?.display_stock || "").toLowerCase() === "yes";

  const openStockEnquiry = (variant = ENQUIRY_VARIANT_NORMAL) => {
    setEnquiryVariant(variant);
    setShowLowStockEnquiry(true);
  };

  /** Exist Get Offer when Sold Out Online (and CUS-Order uses cusorder lead title). */
  const handleGetOffer = () => {
    openStockEnquiry(isCusOrder ? ENQUIRY_VARIANT_CUSORDER : ENQUIRY_VARIANT_NORMAL);
  };

  const addOnIds = Array.isArray(product?.add_ons)
    ? product.add_ons.map(id => id.toString())
    : [];


  useEffect(() => {
    console.log("useEffect triggered", product?._id, addOnIds);
  }, [product?._id]);

  useEffect(() => {
    if (!product?._id) return;
    // FAQs are stored on the product document; no separate FAQ API route exists
    setFaqs(Array.isArray(product.faqs) ? product.faqs : []);
  }, [product?._id]);

  useEffect(() => {
    if (!Array.isArray(product?.add_ons) || product.add_ons.length === 0) return;

    const ids = product.add_ons.map(id => id.toString());

    const fetchAddOnProducts = async () => {
      try {
        const res = await fetch("/api/product/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        const data = await res.json();
        setAddOnProducts(data.products || []);
      } catch (e) {
        setAddOnProducts([]);
      }
    };

    fetchAddOnProducts();
  }, [product?._id]);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      // Step 1: localStorage safe read
      const storedString = localStorage.getItem("recentlyViewed");
      let stored = [];
      try {
        stored = JSON.parse(storedString) || [];
      } catch {
        stored = [];
      }

      // Step 2: array check
      if (!Array.isArray(stored)) stored = [];
      stored = stored.filter((p) => p && p._id);

      if (stored.length === 0) return;

      // Step 3: fetch brands and map
      try {
        const result = await getSharedBrandData();

        if (!result.error) {
          const brandMap = {};
          result.data.forEach((b) => {
            brandMap[b._id] = b.brand_name;
          });

          const productsWithBrands = stored.map((p) => {
            const brandId = p.brand?._id || (typeof p.brand === "string" ? p.brand : null);
            const resolvedBrand =
              p.brand?.name ||
              p.brand?.brand_name ||
              (brandId && brandMap[brandId] ? brandMap[brandId] : "") ||
              p.brand_name ||
              p.brandName ||
              (typeof p.brand === "string" && !/^[0-9a-fA-F]{24}$/.test(p.brand) ? p.brand : "");

            return {
              ...p,
              brand: resolvedBrand || p.brand || "",
            };
          });

          setRecentlyViewedProducts(productsWithBrands);
        } else {
          setRecentlyViewedProducts(stored);
        }
      } catch {
        setRecentlyViewedProducts(stored);
      }
    };

    fetchRecentlyViewed();
  }, []);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize(); // run initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!product?.warranty_ids || product.warranty_ids.length === 0) return;

    fetch(`/api/warranties/by-item-nos?item_nos=${product.warranty_ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setWarranties(d.warranties || []));
  }, [product?._id]);
  const handleDecrease = () => {
    setQuantity(Math.max(1, quantity - 1));
    setQuantityWarning(false); // clear warning when decreasing
  };
  const handleIncrease = () => {
    if (quantity < product.quantity) {
      setQuantity(quantity + 1);
      setQuantityWarning(false); // clear warning if under limit
    } else {
      setQuantityWarning(true); // show warning if exceeding
    }
  };




  // // Function to fetch category products
  //   useEffect(() => {
  //     const fetchCategoryProducts = async () => {
  //       try {
  //         const res = await fetch(`/api/product/category/${categoryId}?limit=5`);
  //         const data = await res.json();
  //         if (data.success) {
  //           setCategoryProducts(data.products);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching category products:", error);
  //       }
  //     };

  //     if (categoryId) fetchCategoryProducts();
  //   }, [categoryId]);



  const { updateCartCount } = useCart();
  const { openAuthModal } = useModal();
  const handleBuyNow = async (e = null) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isInStock) return;

    // Exist blade: CUS-Order → #displayStockModal_cusorder (always)
    if (isCusOrder) {
      openStockEnquiry(ENQUIRY_VARIANT_CUSORDER);
      return;
    }

    // Exist: display_stock == 'yes' → #displayStockModal (do not checkout yet)
    if (isDisplayStockEnquiry) {
      openStockEnquiry(ENQUIRY_VARIANT_NORMAL);
      return;
    }

    if (!isMovementAllowed) return;

    // Prefer offer passed in (legacy), else the offer applied on this PDP
    let exchangeOffer = null;
    const offerSource =
      e &&
      typeof e === 'object' &&
      !('nativeEvent' in e) &&
      !('target' in e) &&
      !('currentTarget' in e) &&
      typeof e.preventDefault !== 'function'
        ? e
        : appliedExchangeOffer;

    if (offerSource && typeof offerSource === 'object') {
      exchangeOffer = {
        id: offerSource._id || offerSource.id || null,
        title: offerSource.title || offerSource.name || offerSource.product_name || null,
        price: Number(offerSource.price || offerSource.discount || offerSource.value || 0),
        brand: typeof offerSource.brand === 'string' ? offerSource.brand : (offerSource.brand?.name || null),
        type: offerSource.type || null,
        condition: offerSource.condition || null,
        model: offerSource.model || null,
        zone: offerSource.zone || null,
      };
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      let isLoggedIn = false;
      let userData = null;

      if (token) {
        try {
          const response = await fetch("/api/auth/check", {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          isLoggedIn = data.loggedIn;
          userData = data.user;
        } catch (authErr) {
          console.warn("Auth check failed:", authErr);
        }
      }

      // ✅ If not logged in → use guestCartId
      let guestCartId = null;
      if (!isLoggedIn && typeof window !== "undefined") {
        guestCartId = localStorage.getItem("guestCartId") || uuidv4();
        localStorage.setItem("guestCartId", guestCartId);
      }

      const productPrice = Number(displaySellingPrice || 0);

      const warrantyEligible = isExtendedWarrantyEligible(product);
      const effectiveWarrantyAmount = warrantyEligible
        ? Number(selectedWarrantyAmount || selectedWarrantyData?.amount || selectedWarrantyData?.price || 0)
        : 0;

      // Safe clean warranty object for checkout and cart state
      const activeWarranty = (warrantyEligible && selectedWarrantyData) ? {
        id: selectedWarrantyData._id || selectedWarrantyData.id || "ew-plan",
        item_no: selectedWarrantyData.item_no || null,
        name: selectedWarrantyData.name || selectedWarrantyData.title || (selectedWarrantyData.year ? `${selectedWarrantyData.year} Year Extended Warranty` : "Extended Warranty"),
        title: selectedWarrantyData.title || selectedWarrantyData.name || (selectedWarrantyData.year ? `${selectedWarrantyData.year} Year Extended Warranty` : "Extended Warranty"),
        year: Number(selectedWarrantyData.year || (selectedWarrantyData.duration ? parseInt(selectedWarrantyData.duration, 10) : 1)),
        duration: selectedWarrantyData.duration || (selectedWarrantyData.year ? `${selectedWarrantyData.year} Year` : ""),
        price: effectiveWarrantyAmount
      } : null;

      // ✅ Add main product to cart (non-fatal if sync fails — still proceed to checkout)
      try {
        const effectivePincode = globalPincode || userLocation?.pincode || "";
        const effectiveUserState = userLocation?.stateName || userLocation?.state || (globalRegion === "karnataka" ? "Karnataka" : "Tamil Nadu");
        const effectiveRegion = globalRegion || userLocation?.region || (effectiveUserState === "Karnataka" ? "karnataka" : "tamilnadu");

        const cartResponse = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isLoggedIn && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            productId: product?._id,
            quantity: Number(quantity) || 1,
            selectedWarranty: Number(activeWarranty?.year || (effectiveWarrantyAmount > 0 ? 1 : 0)),
            selectedExtendedWarranty: effectiveWarrantyAmount,
            warrantyData: activeWarranty,
            variantValues: currentVariantValues || undefined,
            selectedVariant: currentVariantValues || undefined,
            color: currentColor || undefined,
            ...(exchangeOffer ? { exchangeOffer } : {}),
            ...(guestCartId && { guestCartId }),
            pincode: effectivePincode,
            userState: effectiveUserState,
            region: effectiveRegion,
          }),
        });

        if (!cartResponse.ok) {
          const errData = await cartResponse.json().catch(() => ({}));
          const errMsg = errData.error || "This product is currently out of stock.";
          toast.error(errMsg);
          return;
        }

        const additionalProducts = [
          ...selectedFrequentProducts.map((p) => p._id),
          ...selectedRelatedProducts.map((p) => p._id),
        ].filter(Boolean);

        if (additionalProducts.length > 0) {
          await Promise.all(
            additionalProducts.map(async (id) => {
              try {
                await fetch("/api/cart", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(isLoggedIn && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    productId: id,
                    quantity: 1,
                    ...(guestCartId && { guestCartId }),
                    pincode: effectivePincode,
                    userState: effectiveUserState,
                    region: effectiveRegion,
                  }),
                });
              } catch (extraErr) {
                console.warn("Extra product cart add failed:", extraErr);
              }
            })
          );
        }

        const cartData = await cartResponse.json().catch(() => ({}));
        if (cartData?.cart?.totalItems) {
          updateCartCount(cartData.cart.totalItems + additionalProducts.length);
        }
      } catch (cartApiErr) {
        console.warn("Cart API sync warning:", cartApiErr);
      }

      const resolvePrice = (p) => {
        if (p?.usingLsp && !p?.isUnilet && Number(p?.lsp) > 0) return Number(p.lsp);
        if (p?.special_price && Number(p.special_price) > 0) return Number(p.special_price);
        return Number(p?.price || 0);
      };

      const isUniletOnly = Boolean(isUniletProduct(product));
      const isKarnatakaCtx = Boolean(
        isKarnatakaPincode(deliveryPincode || globalPincode) ||
        globalRegion === "karnataka" ||
        deliveryInfo?.assignedVendor === "UNILET"
      );
      const ctxVendorId = isKarnatakaCtx || isUniletOnly ? "unilet" : (product?.vendor || "sathya");
      const ctxAssignedVendor = isKarnatakaCtx || isUniletOnly ? "UNILET" : "SATHYA";
      const ctxRegion = isKarnatakaCtx ? "karnataka" : (globalRegion || "tamilnadu");

      // Clean, strictly serializable items array for checkout
      const cleanMainItem = {
        _id: product?._id,
        id: product?._id || product?.id,
        productId: product?._id,
        product: product?._id,
        name: product?.name || product?.title || "",
        title: product?.title || product?.name || "",
        slug: product?.slug || "",
        item_code: product?.item_code || "",
        price: productPrice,
        special_price: Number(product?.special_price) || 0,
        quantity: Number(quantity) || 1,
        images: Array.isArray(product?.images) ? product.images : [],
        image: (product?.images && product.images[0]) || product?.image || "",
        isUnilet: isUniletOnly,
        vendor: ctxVendorId,
        store_owner: ctxVendorId,
        assignedVendor: ctxAssignedVendor,
        region: ctxRegion,
        warranty: Number(selectedWarranty) || 0,
        extendedWarranty: effectiveWarrantyAmount,
        warrantyData: activeWarranty,
        exchangeOffer: exchangeOffer ? {
          id: exchangeOffer.id,
          title: exchangeOffer.title,
          price: Number(exchangeOffer.price) || 0,
          brand: exchangeOffer.brand || null,
          type: exchangeOffer.type || null,
          condition: exchangeOffer.condition || null,
          model: exchangeOffer.model || null,
          zone: exchangeOffer.zone || null,
        } : null,
      };

      const cleanFrequentItems = selectedFrequentProducts.map((p) => ({
        _id: p._id,
        id: p._id || p.id,
        productId: p._id,
        product: p._id,
        name: p.name || p.title || "",
        title: p.title || p.name || "",
        slug: p.slug || "",
        item_code: p.item_code || "",
        price: resolvePrice(p),
        quantity: 1,
        images: Array.isArray(p.images) ? p.images : [],
        image: (p.images && p.images[0]) || p.image || "",
        isUnilet: Boolean(isUniletProduct(p)),
        vendor: ctxVendorId,
        store_owner: ctxVendorId,
        assignedVendor: ctxAssignedVendor,
        region: ctxRegion,
      }));

      const cleanRelatedItems = selectedRelatedProducts.map((p) => ({
        _id: p._id,
        id: p._id || p.id,
        productId: p._id,
        product: p._id,
        name: p.name || p.title || "",
        title: p.title || p.name || "",
        slug: p.slug || "",
        item_code: p.item_code || "",
        price: resolvePrice(p),
        quantity: 1,
        images: Array.isArray(p.images) ? p.images : [],
        image: (p.images && p.images[0]) || p.image || "",
        isUnilet: Boolean(isUniletProduct(p)),
        vendor: ctxVendorId,
        store_owner: ctxVendorId,
        assignedVendor: ctxAssignedVendor,
        region: ctxRegion,
      }));

      const items = [cleanMainItem, ...cleanFrequentItems, ...cleanRelatedItems];

      const total = items.reduce((sum, item) => {
        const basePrice = item.price * item.quantity;
        const wCost = (item.warranty || 0) * item.quantity;
        const extCost = (item.extendedWarranty || 0) * item.quantity;
        const exDiscount = (item.exchangeOffer?.price || 0) * item.quantity;
        return sum + basePrice + wCost + extCost - exDiscount;
      }, 0);

      const totalPrice = Math.max(0, total);

      // Ensure ONLY serializable plain primitives are stringified
      const checkoutItem = {
        productId: product?._id || product?.id,
        slug: product?.slug,
        title: product?.title || product?.name,
        price: productPrice,
        quantity: Number(quantity) || 1,
        selectedWarranty: activeWarranty,
        totalAmount: totalPrice,
      };

      // Safe serialization without DOM / React synthetic event leaks
      try {
        sessionStorage.setItem("buyNowItem", JSON.stringify(checkoutItem));
        localStorage.setItem(
          "buyNowData",
          JSON.stringify({ cart: { items }, total: totalPrice })
        );
        if (router && typeof router.push === "function") {
          router.push("/checkout");
        } else {
          window.location.href = "/checkout";
        }
      } catch (err) {
        console.error("Safe checkout serialization error:", err);
      }
    } catch (err) {
      console.error("Buy Now error:", err);
    }
  };

  const handleShareProduct = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);




  // const warranties = product?.extend_warranty || [];



  // In your ProductPage component, add these state variables near the top:
  const [selectedFrequentProducts, setSelectedFrequentProducts] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [selectedExtendedWarranty, setSelectedExtendedWarranty] = useState(null);

  // Auto-reset warranty selection whenever product is not eligible for extended warranty
  useEffect(() => {
    if (product && !isExtendedWarrantyEligible(product)) {
      setSelectedWarrantyAmount(0);
      setSelectedExtendedWarranty(null);
      setSelectedWarranty(null);
      setSelectedWarrantyData(null);
    }
  }, [product?._id]);

  // Quick-deselect warranty handler from badge or summary
  const handleDeselectWarranty = useCallback(() => {
    setSelectedWarrantyAmount(0);
    setSelectedExtendedWarranty(null);
    setSelectedWarranty(null);
    setSelectedWarrantyData(null);
  }, []);

  const handleSelectWarranty = useCallback((w, amount) => {
    const numericAmount = Number(amount || w?.amount || w?.price || 0);
    setSelectedWarrantyData(w);
    setSelectedWarrantyAmount(numericAmount);
    setSelectedExtendedWarranty(numericAmount);
  }, []);

  const handleExchangeApply = (offer) => {
    if (!offer) {
      setAppliedExchangeOffer(null);
      return;
    }
    // Stay on product page — only store the offer until Add to Cart / Buy Now
    setAppliedExchangeOffer({
      id: offer._id || offer.id || null,
      title: offer.title || offer.name || null,
      price: Number(offer.price || 0),
      brand: typeof offer.brand === "string" ? offer.brand : (offer.brand?.name || null),
      type: offer.type || null,
      condition: offer.condition || null,
      model: offer.model || null,
      zone: offer.zone || null,
    });
  };

  const [quantityWarning, setQuantityWarning] = useState(false);

  // Add this function to handle frequent product selection
  const toggleFrequentProduct = (product) => {
    setSelectedFrequentProducts(prev => {
      const existingIndex = prev.findIndex(p => p._id === product._id);
      if (existingIndex >= 0) {
        return prev.filter(p => p._id !== product._id);
      } else {
        return [...prev, product];
      }
    });
  };

  // Fetch related products
  // // Fetch related products
  // const fetchRelatedProducts = async () => {
  //   try {
  //     setLoading(true);
  //     const res = await fetch(`/api/product/related?productId=${product._id}`);
  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(`API error: ${res.status} ${res.statusText}`);
  //     }

  //     if (res.ok && data.success) {
  //       setRelatedProducts(data.products || []);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching related products:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   if (product?._id) {
  //     fetchRelatedProducts(product._id);
  //   }
  // }, [product]);




  const categoryId = product?.category;
  const currentProductId = product?._id;
  const brandId = product?.brand;
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const res = await fetch(
          `/api/product/relatedpro?category=${categoryId}&brand=${brandId}&exclude=${currentProductId}&limit=5&region=${encodeURIComponent(globalRegion || "tamilnadu")}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        console.log("current related products is:", data);

        if (res.ok) {
          if (data.success && data.products) {
            setRelatedProducts(data.products);
          } else if (data.relatedProducts) {
            setRelatedProducts(data.relatedProducts);
          } else {
            setRelatedProducts([]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (!isInitialized || !categoryId || !brandId) return;
    fetchRelatedProducts();
  }, [categoryId, brandId, currentProductId, globalRegion, isInitialized]);


  const toggleRelatedProduct = (product) => {
    setSelectedRelatedProducts(prev => {
      const existingIndex = prev.findIndex(p => p._id === product._id);
      if (existingIndex >= 0) {
        return prev.filter(p => p._id !== product._id);
      } else {
        return [...prev, product];
      }
    });
  };

  //  Add this useEffect to calculate the cart total whenever selected products change
  // Calculate cart total
  useEffect(() => {
    let total = product ? displaySellingPrice * quantity : 0;

    selectedFrequentProducts.forEach(item => {
      total += resolveItemSellingPrice(item);
    });

    // NEW: Add selected related products to total
    selectedRelatedProducts.forEach(item => {
      total += resolveItemSellingPrice(item);
    });

    if (selectedWarranty) total += Number(selectedWarranty);
    const isEligibleWarranty = isExtendedWarrantyEligible(product);
    const extAmt = isEligibleWarranty ? Number(
      selectedWarrantyAmount ||
      selectedExtendedWarranty ||
      selectedWarrantyData?.amount ||
      selectedWarrantyData?.price ||
      0
    ) : 0;
    if (extAmt > 0) total += extAmt;

    setCartTotal(total);
  }, [
    selectedFrequentProducts,
    selectedRelatedProducts,
    product,
    quantity,
    displaySellingPrice,
    resolveItemSellingPrice,
    selectedWarranty,
    selectedExtendedWarranty,
    selectedWarrantyAmount,
    selectedWarrantyData,
  ]);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!product?._id) return;
      const ids = product?.featured_products?.length ? product.featured_products : [];
      try {
        const res = await fetch(`/api/product/featured?region=${encodeURIComponent(globalRegion || "tamilnadu")}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids,
            category: product?.category,
            brand: product?.brand,
            limit: 2
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const fbtList = Array.isArray(data) ? data.slice(0, 2) : [];
          setFeaturedProducts(fbtList);
        }
      } catch (err) {
        console.error("FBT fetch error:", err);
      }
    };

    if (!isInitialized) return;
    fetchFeaturedProducts();
  }, [product?._id, product?.category, product?.brand, globalRegion, isInitialized]);
  // derived main image
  const mainImage = (product?.images && product.images.length > 0 && product.images[selectedImageIndex]) ? product.images[selectedImageIndex] : "/uploads/products/placeholder.jpg";
  const matchedBrandForManufacturer = (() => {
    if (!product?.brand || !Array.isArray(brand)) return null;
    const brandId =
      typeof product.brand === "object"
        ? String(product.brand._id || product.brand.id || "")
        : String(product.brand);
    return brand.find((b) => String(b.value) === brandId) || null;
  })();

  // helper to resolve full path
  const resolveImagePath = (image) => {
    if (!image || typeof image !== "string" || image.trim() === "" || image === "null" || image === "undefined") {
      return "/uploads/products/placeholder.jpg";
    }
    const clean = image.trim();
    if (
      clean.startsWith("http") ||
      clean.startsWith("blob:") ||
      clean.startsWith("data:") ||
      clean.startsWith("/")
    ) return clean;
    return `/uploads/products/${clean}`;
  };

  const assetFallbackBase = (process.env.NEXT_PUBLIC_ASSET_FALLBACK_URL || "https://estore.bharathelectronics.in").replace(/\/+$/, "");

  const handleImageErrorFallback = (e, originalImage) => {
    const currentSrc = e?.currentTarget?.src || "";
    const clean = typeof originalImage === "string"
      ? originalImage.trim().replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "")
      : "";
    if (clean && !currentSrc.includes(assetFallbackBase) && !currentSrc.includes("placeholder")) {
      e.currentTarget.src = `${assetFallbackBase}/uploads/products/${clean}`;
    } else {
      e.currentTarget.onerror = null;
      e.currentTarget.src = "/uploads/products/placeholder.jpg";
    }
  };


  const [selectedImage, setSelectedImage] = useState(
    initialProduct?.images?.[0] || null
  );

  useEffect(() => {
    if (product?.images?.[0]) {
      // setSelectedImage(`/uploads/products/${product.images[0]}`);
      setSelectedImage(product.images[0]);
    }
  }, [product?._id]);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, visible: false });
  const imgRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomContainerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");     // <-- declare this
  const [showGoHome, setShowGoHome] = useState(false);
  const [showZoomLens, setShowZoomLens] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const zoomLensRef = useRef(null);
  const zoomResultRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [showWarrantyModal, setshowWarrantyModal] = useState(false);
  const [showGstInvoiceModal, setshowGstInvoiceModal] = useState(false);

  // ###### Show Customer Reviews ###### //
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    setFlixInpageAvailable(null);
  }, [product?._id]);

  useEffect(() => {
    const applyProductData = (data, { pricesOnly = false } = {}) => {
      const regionKey = globalRegion || "tamilnadu";
      const remember = (key, value) => {
        if (key) variantCacheRef.current[`${regionKey}::${key}`] = value;
      };
      if (data?.variantGroup?.products?.length) {
        const group = data.variantGroup;
        group.products.forEach((sibling) => {
          const cachedSibling = { ...sibling, variantGroup: group };
          remember(sibling?.slug, cachedSibling);
          remember(sibling?._id ? String(sibling._id) : "", cachedSibling);
        });
        if (data.slug) remember(data.slug, { ...data, variantGroup: group });
      } else if (data?.slug) {
        remember(data.slug, data);
      }

      const current = productRef.current;
      if (pricesOnly && current && (current.slug === data.slug || String(current._id) === String(data._id))) {
        setProduct({
          ...current,
          price: data.price,
          special_price: data.special_price,
          quantity: data.quantity != null ? data.quantity : current.quantity,
          stock: data.quantity != null ? data.quantity : current.stock,
          stock_status: data.stock_status || current.stock_status,
          isUnilet: data.isUnilet != null ? data.isUnilet : current.isUnilet,
          resolvedRegion: data.resolvedRegion,
          bestPriceDetails: data.bestPriceDetails,
          best_price: data.best_price,
          variantGroup: data.variantGroup || current.variantGroup,
        });
        return;
      }

      setProduct(data);
      setSelectedImageIndex(0);
      setQuantity(1);
      if (data?.images?.[0]) setSelectedImage(`/uploads/products/${data.images[0]}`);
    };

    const fetchProduct = async () => {
      const requestSlug = productRef.current?.slug || slug;
      if (!requestSlug) return;
      const region = globalRegion || "tamilnadu";
      const sameProduct = Boolean(productRef.current);

      // If initialProduct is already loaded for this slug and region, skip refetching
      if (
        productRef.current &&
        productRef.current.slug === requestSlug &&
        productRef.current.resolvedRegion === region
      ) {
        setLoading(false);
        return;
      }

      const cached = variantCacheRef.current[`${region}::${requestSlug}`];
      if (cached) {
        applyingVariantRef.current = false;
        applyProductData(cached, { pricesOnly: sameProduct && cached.slug === productRef.current?.slug });
        setLoading(false);
        return;
      }

      try {
        setLoading((currentLoading) => (sameProduct ? currentLoading : true));
        const response = await fetch(
          `/api/product/${encodeURIComponent(requestSlug)}?region=${encodeURIComponent(region)}&pincode=${encodeURIComponent(effectivePincode)}&state=${encodeURIComponent(effectiveUserState)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            router.push("/404");
            return;
          }
          setErrorMessage("Content not loading. Please try again later.");
          setShowGoHome(true);
          return;
        }

        const data = await response.json();
        if (!data || data.status !== "Active") {
          router.push("/404");
          return;
        }

        if (Array.isArray(data)) {
          const foundProduct = data.find((p) => p.slug === slug);
          if (!foundProduct) {
            throw new Error("Product not found");
          }
          applyProductData(foundProduct, { pricesOnly: sameProduct });
        } else if (data && data.slug) {
          applyProductData(data, { pricesOnly: sameProduct });
        } else {
          throw new Error("Invalid product data");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Something went wrong");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (!isInitialized) return;
    fetchProduct();
    // Pincode/region changes do a full page reload — do not partially refetch here.
  }, [slug, globalRegion, isInitialized]);

  useEffect(() => {
    if (!product?._id) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/reviews/${product._id}`)
        .then((res) => res.json())
        .then((reviewsData) => {
          if (cancelled || !reviewsData.success) return;
          setReviews(reviewsData.reviews);
          setAvgRating(reviewsData.avgRating);
          setReviewCount(reviewsData.count);
        })
        .catch((error) => {
          console.error("Error fetching reviews:", error);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [product?._id]);

  const handleVariantSelect = (match) => {
    if (!match) return;
    const targetSlug = match.slug || String(match._id || "");
    if (!targetSlug) return;
    if (String(match._id) === String(product?._id) && targetSlug === String(slug)) return;

    const group = product?.variantGroup;
    const cached = {
      ...(variantCacheRef.current[variantKey(targetSlug)] || match),
      variantGroup: group,
    };
    variantCacheRef.current[variantKey(targetSlug)] = cached;
    applyingVariantRef.current = true;
    setProduct(cached);
    setSelectedImageIndex(0);
    setQuantity(1);
    setSelectedWarrantyAmount(0);
    setSelectedWarrantyData(null);
    if (cached?.images?.[0]) setSelectedImage(`/uploads/products/${cached.images[0]}`);

    const nextUrl = params?.sub_slug_one
      ? `/category/${params.slug}/${params.sub_slug}/${targetSlug}`
      : `/product/${targetSlug}`;
    if (typeof window !== "undefined" && window.location.pathname !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  };

  useEffect(() => {
    const onPopState = () => {
      const currentSlug = window.location.pathname.split("/").filter(Boolean).pop();
      const cached = currentSlug ? variantCacheRef.current[variantKey(currentSlug)] : null;
      if (cached) {
        setProduct(cached);
        setSelectedImageIndex(0);
        if (cached?.images?.[0]) setSelectedImage(`/uploads/products/${cached.images[0]}`);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);




  const fetchBrand = async () => {
    try {
      const result = await getSharedBrandData();
      if (result.error) {
        console.error(result.error);
      } else {
        const data = result.data || [];

        // Format for react-select
        const brandOptions = data.map((b) => ({
          value: b._id,
          label: b.brand_name,
          manufacturer_name: b.manufacturer_name || "",
          manufacturer_address: b.manufacturer_address || "",
        }));

        setBrand(brandOptions);
        // 👉 If you already have the ID and want to get the label (e.g., when editing)
        if (product?.brand) {
          const matched = brandOptions.find((b) => b.value === product.brand);
          // if (matched) console.log("Selected Brand Name:", matched.label);
        }

      }
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrand();
    }, 200);
    return () => clearTimeout(timer);
  }, []);



  const handleThumbnailClick = (index) => {
    const imagePath = product.images?.[index];

    if (imagePath) {
      // Use same logic as main image src
      const finalSrc =
        imagePath.startsWith("http") ||
          imagePath.startsWith("blob:") ||
          imagePath.startsWith("data:")
          ? imagePath
          : `/uploads/products/${imagePath}`;

      setSelectedImage(finalSrc);
    }
  };

  // Handle mouse movement for zoom lens
  const handleMouseMove = (e) => {
    if (!imgRef.current || !zoomLensRef.current || !zoomResultRef.current) return;

    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    if (!width || !height) return;
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    // Keep position within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    // Direct DOM updates for silky smooth 60fps tracking without triggering React component re-renders
    zoomLensRef.current.style.left = `calc(${boundedX}% - 75px)`;
    zoomLensRef.current.style.top = `calc(${boundedY}% - 75px)`;
    zoomResultRef.current.style.backgroundPosition = `${boundedX}% ${boundedY}%`;
  };

  const handleMouseEnter = () => {
    setShowZoomLens(true);
  };

  const handleMouseLeave = () => {
    setShowZoomLens(false);
  };

  const openLightbox = (index = 0) => {
    if (product?.images && product.images.length > 0) {
      setLightboxIndex(index);
      setLightboxOpen(true);
      setSelectedImage(product.images[index]);
    }
  };


  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateLightbox = (direction) => {
    if (!product?.images || product.images.length === 0) return;

    let newIndex;
    if (direction === "prev") {
      newIndex =
        (selectedImageIndex - 1 + product.images.length) % product.images.length;
    } else {
      newIndex = (selectedImageIndex + 1) % product.images.length;
    }

    setSelectedImageIndex(newIndex);
  };

  // Handle keyboard events for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox('prev');
        if (e.key === 'ArrowRight') navigateLightbox('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxIndex]);

  if (loading) {
    return <ProductSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#d72828]">{error}</h2>
          <Link href="/" className="mt-4 inline-flex items-center text-[#d72828] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return <ProductSkeleton />;
  }

  if (!product.name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Product not found</h2>
          <Link href="/" className="mt-4 inline-flex items-center text-[#d72828] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!product.images) {
    return <ProductSkeleton />;
  }

  const isOpenBox = isOpenBoxEligible(product);

  const handleNotifyMe = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setNotifyMeSuccess(true);
  };

  const scrollToRelatedProducts = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const el = document.querySelector('section[aria-label="Related Products"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <FlixMediaLoader
        product={product}
        brandName={matchedBrandForManufacturer?.label || brand.find((b) => String(b.value) === String(product?.brand))?.label || ""}
        enabled={Boolean(product?._id) && brand.length > 0}
        onInpage={handleFlixInpage}
        onNoshow={handleFlixNoshow}
      />
      {errorMessage && (
        <div className="text-center mt-10">
          <p className="text-red-600 text-lg mb-3">{errorMessage}</p>
          {showGoHome && (
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Go to Home Page
            </Link>
          )}
        </div>
      )}


      <div className="container mx-auto px-2 md:px-4 pt-2 pb-8">

        {/* ===== MOBILE & TABLET VIEW (hidden on desktop) ===== */}
        <div className="block lg:hidden w-full">
          {/* Mobile Breadcrumb */}
          <ProductBreadcrumb product={product} className="mb-3 text-xs" />

          {/* 1. Product Image */}
          <div className="w-full relative">
            <div className="border border-gray-400 rounded-lg relative">
              <OfferRibbonBadge
                offerName={highlightOffer?.offerName}
                labelText={highlightOffer?.labelText}
                labelColor={highlightOffer?.labelColor}
              />

              <div
                className="relative aspect-square w-full px-4"
                onClick={() => openLightbox(0)}
                ref={zoomContainerRef}
              >
                <img
                  src={resolveImagePath(mainImage)}
                  alt={product?.name || "Product"}
                  className="w-full h-full object-contain rounded-xl"
                  ref={imgRef}
                  onError={(e) => handleImageErrorFallback(e, mainImage)}
                />
              </div>
            </div>

            {/* Thumbnails */}
            <ThumbnailStrip
              images={product.images}
              selectedImageIndex={selectedImageIndex}
              onSelect={setSelectedImageIndex}
              resolveImagePath={resolveImagePath}
              onError={handleImageErrorFallback}
            />


          </div>

          {/* 2. Brand + Name + Price */}
          <div className="mt-4">
            <h1 className="text-lg font-bold text-gray-900 leading-snug mt-1">{product.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              {product.model_number && <span>Model: {product.model_number}</span>}
              {product.model_number && product.item_code && <span className="text-gray-300">|</span>}
              {product.item_code && <span>SKU: {product.item_code}</span>}
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-sm font-semibold text-gray-800">{avgRating}</span>
                <span className="text-xs text-[#d72828] underline">({reviewCount} Reviews)</span>
              </div>
            )}

            <ExchangeOfferSection
              productCategory={product.sub_category_new_name ? product.sub_category_new_name.replace(/##/g, ",") : (product.categoryName || "")}
              categoryId={product.category}
              subCategoryId={product.sub_category}
              sellingPrice={effectivePrice}
              mrp={product.price + (selectedWarrantyAmount || 0)}
              onExchangeApply={handleExchangeApply}
              onAvailabilityChange={setHasExchangeOffers}
            />

            {/* Price — Exist: LSP (if set) → special → MRP; Unilet view skips LSP via server resolve */}
            <div className={`mt-3 border-t border-gray-200 pt-3 ${hasExchangeOffers ? "hidden" : ""}`}>

              <div className="flex flex-col leading-tight">
                <span className="text-2xl font-bold text-[#d72828]">
                  ₹ {Number(effectivePrice).toLocaleString('en-IN')}
                </span>
                {selectedWarrantyAmount > 0 ? (
                  <div className="mt-1">
                    <WarrantyBadge
                      selectedWarranty={selectedWarrantyData}
                      selectedWarrantyAmount={selectedWarrantyAmount}
                      onDeselect={handleDeselectWarranty}
                    />
                  </div>
                ) : usingLspPrice ? (
                  <span className="text-xs text-gray-500 mt-0.5">(Incl. all Taxes)</span>
                ) : (
                  product.special_price > 0 && (
                    <span className="text-xs text-gray-500 mt-0.5">Special Price</span>
                  )
                )}
              </div>

              {mainDiscountInfo.showDiscount && (
                <div className="flex flex-col sm:flex-row w-full sm:items-start sm:justify-between gap-1.5 sm:gap-6 mt-2 sm:mt-3">
                  <div className="flex flex-wrap items-baseline gap-1.5 sm:flex-col sm:leading-tight sm:flex-1 sm:min-w-0 sm:pr-3 sm:border-r sm:border-gray-200">
                    <span className="text-xs sm:text-sm text-gray-500 line-through whitespace-nowrap">
                      MRP ₹ {Number(product.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] sm:text-xs text-gray-500 sm:mt-1 whitespace-nowrap">
                      (Inclusive of all taxes)
                    </span>
                  </div>

                  <div className="flex flex-col leading-tight sm:flex-1 sm:min-w-0 sm:px-3 sm:border-r sm:border-gray-200">
                    <div className="flex items-center flex-wrap gap-2">
                      <p className="text-green-600 font-semibold text-xs sm:text-sm flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>You Save ₹ {Number(product.price - displaySellingPrice).toLocaleString('en-IN')}</span>
                      </p>
                      <span className="inline-block sm:hidden bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        {mainDiscountInfo.discountPercent}% OFF
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                      Price includes all applicable taxes
                    </span>
                  </div>

                  <div className="hidden sm:flex sm:flex-col sm:items-end sm:justify-start sm:flex-shrink-0 sm:pl-3">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
                      {mainDiscountInfo.discountPercent}% OFF
                    </span>
                  </div>
                </div>
              )}

              {!mainDiscountInfo.showDiscount && (
                <p className="text-xs text-gray-400 mt-0.5">Price includes all applicable taxes</p>
              )}
            </div>

            {/* Stock */}
            <div className="mt-2">
              {isInStock ? (
                isOnlineAvailable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                      <span className="flex items-center justify-center w-3 h-3 rounded-full bg-green-600 flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      In Stock ({productQty} units)
                    </span>

                    {isOpenBox && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Clearance / Open Box Item - Direct Store/Phone Purchase Only</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
                      Sold Out Online
                    </span>
                    <span className="inline-flex items-center gap-1.5 border border-emerald-500 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-sm font-semibold">
                      <FaStore className="w-3.5 h-3.5" />
                      Available in Store ({productQty} units)
                    </span>
                  </div>
                )
              ) : (
                <span className="text-red-600 font-semibold text-sm">✗ Out of Stock</span>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Sold by{" "}
                <span className="font-semibold">
                  {isKarnatakaPincode(deliveryPincode || globalPincode) ||
                  globalRegion === "karnataka" ||
                  deliveryInfo?.assignedVendor === "UNILET" ||
                  product?.isUnilet
                    ? "Unilet"
                    : "Sathya Stores"}
                </span>
              </p>
            </div>

            {/* FlixMedia minisite target */}
            <div className="key-fea"></div>
            {!isDesktop ? <FlixMinisiteSlot /> : null}

            {/* Share / Compare / Wishlist (Mobile) */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={handleShareProduct}
                className={`w-full ${outlineActionBtnClass}`}
                title="Share this product"
              >
                <FaShareAlt className="w-3.5 h-3.5 text-[#d72828] shrink-0" />
                <span className="truncate">Share</span>
              </button>
              <CompareButton
                product={product}
                variant="text"
                iconSize={14}
                label="Compare"
                activeLabel="Compare"
                className={`w-full ${outlineActionBtnClass}`}
              />
              <AddToWishlistButton
                productId={product._id}
                label="Wishlist"
                iconSize={14}
                className={`w-full ${outlineActionBtnClass}`}
              />
            </div>

            {/* Variants + Quantity + Buy Now + Add to Cart */}
            <div className="mt-3">
              <ProductVariantSelector
                variantGroup={product.variantGroup}
                currentProductId={product._id}
                onSelect={handleVariantSelect}
              />
              {isInStock && isMovementAllowed && !isOpenBox && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded px-2 py-1 gap-3">
                    <button onClick={handleDecrease} className="text-gray-600 font-bold text-base">−</button>
                    <span className="text-sm font-semibold w-5 text-center">{quantity}</span>
                    <button onClick={handleIncrease} className="text-gray-600 font-bold text-base">+</button>
                  </div>
                  {quantityWarning && <p className="text-red-500 text-xs">Max {product.quantity} only</p>}
                </div>
              )}

              {/* Live Price Summary above Mobile Actions if Warranty Selected */}
              {isInStock && isMovementAllowed && isExtendedWarrantyEligible(product) && selectedWarrantyAmount > 0 && (
                <div className="py-1.5 px-3 bg-emerald-50/70 border border-emerald-200/80 rounded-md mb-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-semibold">Total Price:</span>
                    <span className="font-bold text-[#d72828] text-sm">
                      ₹ {Number((displaySellingPrice * quantity) + selectedWarrantyAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <span className="block text-[10.5px] text-gray-500 font-normal mt-0.5">
                    Includes ₹{Number(displaySellingPrice * quantity).toLocaleString("en-IN")} product + ₹{selectedWarrantyAmount.toLocaleString("en-IN")} warranty
                  </span>
                </div>
              )}

              {!isInStock && (
                <div className="flex flex-col gap-2">
                  <div className="w-full bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg flex items-center justify-center text-xs uppercase tracking-wider cursor-not-allowed border border-gray-300 select-none">
                    Currently Out of Stock
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleNotifyMe}
                      disabled={notifyMeSuccess}
                      className={`w-full font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        notifyMeSuccess
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm active:scale-95"
                      }`}
                    >
                      <FaBell className="w-3.5 h-3.5" />
                      {notifyMeSuccess ? "Notified ✓" : "Notify Me"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToRelatedProducts}
                    className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer"
                  >
                    <span>View Similar Products</span>
                    <span className="text-[12px] font-bold text-[#d72828]">↓</span>
                  </button>
                </div>
              )}
              {isInStock && (
                <div className="flex gap-3">
                  {isOpenBox ? (
                    <a
                      href={`tel:${CLEARANCE_PHONE}`}
                      className="flex-1 flex items-center justify-center gap-2.5 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-md transition-all duration-200 cursor-pointer active:scale-95 text-center"
                      title="Call to Order Clearance Unit"
                    >
                      <FaPhoneAlt className="w-4 h-4 flex-shrink-0 text-white self-center" />
                      <div className="flex flex-col items-center text-center leading-tight">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">CALL TO ORDER</span>
                        <span className="text-[9px] sm:text-[10px] font-medium opacity-90 tracking-wide mt-0.5">(CLEARANCE UNIT)</span>
                      </div>
                    </a>
                  ) : !isOnlineAvailable ? (
                    <button
                      type="button"
                      onClick={handleGetOffer}
                      className="flex-1 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm bg-[#d72828] hover:bg-[#c02020] text-white cursor-pointer"
                    >
                      Get Offer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyNow()}
                      className="flex-1 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm bg-[#d72828] hover:bg-[#c02020] text-white cursor-pointer"
                    >
                      <FaStore className="w-4 h-4" />
                      {isCusOrder ? "Order Now" : "Buy Now"}
                    </button>
                  )}
                  {(isOnlineAvailable || isOpenBox) && (
                  <div className="flex-1">
                    <ProductAddtoCart
                      productId={product._id}
                      stockQuantity={product.quantity}
                      quantity={quantity}
                      special_price={displaySellingPrice}
                      display_stock={product.display_stock}
                      additionalProducts={[...selectedFrequentProducts.map((p) => p._id), ...selectedRelatedProducts.map((p) => p._id)]}
                      extendedWarranty={isExtendedWarrantyEligible(product) ? selectedWarrantyAmount : 0}
                      selectedFrequentProducts={selectedFrequentProducts}
                      selectedRelatedProducts={selectedRelatedProducts}
                      warrantyData={isExtendedWarrantyEligible(product) ? selectedWarrantyData : null}
                      variantValues={currentVariantValues}
                      selectedVariant={currentVariantValues}
                      color={currentColor}
                      exchangeOffer={appliedExchangeOffer}
                      buttonLabel={isOpenBox ? "Enquire to Buy" : isCusOrder ? "Order Now" : "Add to Cart"}
                      buttonClassName={addToCartOutlineClass}
                      movement={product.movement}
                      productName={product.name}
                      productSlug={product.slug}
                      productCategory={
                        product.sub_category_new_name
                          ? String(product.sub_category_new_name).replace(/##/g, ",")
                          : product.categoryName || product.category_name || ""
                      }
                    />
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Standard Mobile/Desktop Shared Wrapper Container */}
          <div className="w-full block">
            {!isDesktop && (
              <div className="mt-4">
                <PaymentOffers
                  product={product}
                  price={effectivePrice}
                  onOpenEmiModal={() => setIsEmiModalOpen(true)}
                  externalShowEmiModal={showEMIModal}
                  onExternalCloseEmiModal={() => setShowEMIModal(false)}
                  onAvailabilityChange={setHasPaymentOffers}
                />
                {lspPdpEnabled ? (
                  <CompetitorPriceTracker product={product} className={hasPaymentOffers ? "mt-3" : "mt-0"} />
                ) : null}
                <ProductInstallationWarrantySection
                  product={product}
                  warranties={warranties}
                  selectedWarrantyData={selectedWarrantyData}
                  onSelectWarranty={handleSelectWarranty}
                  className="mt-3"
                />
              </div>
            )}
          </div>
          {/* Add Ons — Mobile */}
          {addOnProducts.filter(item => item.quantity > 0 && item.status === "Active").length > 0 && (
            <div className="mt-4 border border-gray-300 rounded-lg bg-white">
              <div className="px-4 py-4">
                <h2 className="text-sm font-bold text-[#d72828] underline mb-2">Add Ons</h2>
                {addOnProducts.filter(item => item.quantity > 0 && item.status === "Active").slice(0, 3).map((item) => (
                  <div key={item._id} className="flex items-start mb-4">
                    <input type="checkbox" className="mt-2 mr-3"
                      checked={selectedRelatedProducts.some(p => p._id === item._id)}
                      onChange={() => toggleRelatedProduct(item)} />
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={resolveImagePath(item.images?.[0] || item.image)}
                        alt={item.name || "Addon"}
                        className="w-14 h-14 object-contain"
                        onError={(e) => handleImageErrorFallback(e, item.images?.[0] || item.image)}
                      />
                      <div className="text-sm flex-1 min-w-0">
                        <Link href={`/product/${item.slug}`}>
                          <h3 className="text-xs font-medium hover:text-[#d72828] line-clamp-2">{item.name}</h3>
                        </Link>
                        <span className="text-sm font-semibold text-red-600">
                          ₹ {Number(resolveItemSellingPrice(item)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Extended Warranty — Mobile */}
          {warranties.length > 0 && isExtendedWarrantyEligible(product) && (
            <div className="border border-gray-200 rounded-lg p-4 mt-3">
              <div className="flex items-center gap-2 mb-3">
                <FaShield className="text-[#d72828] w-5 h-5" />
                <h3 className="font-bold text-sm text-gray-800">Add Extended Warranty</h3>
              </div>

              {/* No Warranty option */}
              <label className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="warranty_mobile"
                    checked={selectedWarrantyData === null}
                    onChange={() => {
                      setSelectedWarrantyData(null);
                      setSelectedWarrantyAmount(0);
                    }}
                    className="accent-[#d72828]"
                  />
                  <span className="text-sm text-gray-700">No Extended Warranty</span>
                </div>
              </label>

              {/* Warranty options */}
              {[...warranties]
                .sort((a, b) => (a.year || 0) - (b.year || 0))
                .map((w, index) => (
                  <label
                    key={w.item_no || index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="warranty_mobile"
                        checked={selectedWarrantyData?.item_no === w.item_no}
                        onChange={() => {
                          setSelectedWarrantyData(w);
                          setSelectedWarrantyAmount(w.price);
                        }}
                        className="accent-[#d72828]"
                      />
                      <span className="text-sm text-gray-700">{w.year} Year Extended Warranty</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      ₹ {w.price.toLocaleString("en-IN")}
                    </span>
                  </label>
                ))}
            </div>
          )}
          {/* 4. ProductDetailsSection (Highlights, Overview, Specs, Reviews, FAQ) */}
          <div className="mt-4">
            <ProductDetailsSection
              key={product._id}
              product={product}
              reviews={reviews}
              avgRating={avgRating}
              reviewCount={reviewCount}
              manufacturerName={matchedBrandForManufacturer?.manufacturer_name}
              manufacturerAddress={matchedBrandForManufacturer?.manufacturer_address}
              flixInstanceActive={!isDesktop}
              flixInpageAvailable={flixInpageAvailable}
            />
          </div>

          {/* 5. Frequently Bought Together */}
          {featuredProducts?.filter(item => item.stock_status === "In Stock").length > 0 && (
            <div className="mt-4 border border-gray-300 rounded-lg bg-white p-3">
              <h3 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-2 mb-3 uppercase tracking-wide">Frequently Bought Together:</h3>
              <div className="space-y-3">
                {featuredProducts.slice(0, 2).map((item, index) => (
                  <div key={item._id || index} className={`flex items-start gap-2.5 pb-2.5 border-b border-gray-100 last:border-0 ${(!isInStock || !isMovementAllowed) ? 'opacity-60' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#d72828] cursor-pointer w-4 h-4 disabled:cursor-not-allowed disabled:opacity-50"
                      checked={(!isInStock || !isMovementAllowed) ? false : selectedFrequentProducts.some(p => p._id === item._id)}
                      onChange={() => {
                        if (isInStock && isMovementAllowed) toggleFrequentProduct(item);
                      }}
                      disabled={!isInStock || !isMovementAllowed}
                      title={!isInStock ? "Main product is out of stock" : !isMovementAllowed ? "Main product is sold out online" : ""}
                    />
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <img
                        src={resolveImagePath(item.images?.[0] || item.image)}
                        alt={item.name || "Product"}
                        className="w-12 h-12 object-contain flex-shrink-0 rounded border border-gray-200"
                        onError={(e) => handleImageErrorFallback(e, item.images?.[0] || item.image)}
                      />
                      <div className="text-xs flex-1 min-w-0">
                        <Link href={`/product/${item.slug}`} className="block hover:underline">
                          <h4 className="font-medium text-gray-800 line-clamp-2 text-[11px] leading-snug">{item.name}</h4>
                        </Link>
                        <div className="flex flex-col mt-1">
                          {getDiscountInfo(item?.price, resolveItemSellingPrice(item)).showDiscount && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹ {Number(item?.price).toLocaleString('en-IN')}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-gray-500 font-medium">Buy Together for</span>
                            <span className="font-bold text-[#d72828]">
                              ₹ {Number(resolveItemSellingPrice(item)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Products */}
          {relatedProducts.filter(item => item.quantity > 0 && item.status === "Active").length > 0 && (
            <div className="mt-4 border border-gray-300 rounded-lg bg-white">
              <div className="px-4 py-4">
                <h2 className="text-sm font-bold text-[#d72828] underline mb-2">Similar Products</h2>
                {relatedProducts.filter(item => item.quantity > 0 && item.status === "Active").slice(0, 3).map((item, index) => (
                  <div key={item._id || index} className="flex items-start mb-4">
                    <input type="checkbox" className="mt-2 mr-3"
                      checked={selectedRelatedProducts.some(p => p._id === item._id)}
                      onChange={() => toggleRelatedProduct(item)} />
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={resolveImagePath(item.images?.[0] || item.image)}
                        alt={item.name || "Related"}
                        className="w-14 h-14 object-contain"
                        onError={(e) => handleImageErrorFallback(e, item.images?.[0] || item.image)}
                      />
                      <div className="text-sm flex-1 min-w-0">
                        <Link href={`/product/${item.slug}`} className="block mb-1">
                          <h3 className="text-xs font-medium hover:text-[#d72828] line-clamp-2">{item.name}</h3>
                        </Link>
                        <span className="text-sm font-semibold text-red-600">
                          ₹ {Number(resolveItemSellingPrice(item)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. Add Selected to Cart */}
          {(selectedRelatedProducts.length > 0 || selectedFrequentProducts.length > 0) && (
            <div className="mt-4 sticky bottom-0 bg-white border-t border-gray-200 pt-3 pb-3 z-10">
              {(selectedRelatedProducts.length > 0 || selectedFrequentProducts.length > 0) && (
                <div className="w-full bg-[#d72828] text-white font-semibold py-2 rounded-md flex items-center justify-between px-4 mb-2">
                  <div className="flex items-center gap-2">
                    <FaCartPlus className="text-white w-5 h-5" />
                    <span className="text-sm font-semibold">Cart Total</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold">₹{cartTotal.toLocaleString('en-IN')}</span>
                    <Link href="/cart" className="text-[11px] text-white hover:underline">View Cart</Link>
                  </div>
                </div>
              )}
              <ProductAddtoCart
                productId={product._id}
                stockQuantity={product.quantity}
                quantity={quantity}
                special_price={displaySellingPrice}
                display_stock={product.display_stock}
                additionalProducts={[...selectedFrequentProducts.map((p) => p._id), ...selectedRelatedProducts.map((p) => p._id)]}
                extendedWarranty={selectedWarrantyAmount}
                selectedFrequentProducts={selectedFrequentProducts}
                selectedRelatedProducts={selectedRelatedProducts}
                warrantyData={selectedWarrantyData}
                variantValues={currentVariantValues}
                selectedVariant={currentVariantValues}
                color={currentColor}
                exchangeOffer={appliedExchangeOffer}
                buttonLabel="Add Selected to Cart"
                buttonClassName="bg-[#d72828] text-white"
                movement={product.movement}
                productName={product.name}
                productSlug={product.slug}
                productCategory={
                  product.sub_category_new_name
                    ? String(product.sub_category_new_name).replace(/##/g, ",")
                    : product.categoryName || product.category_name || ""
                }
              />
            </div>
          )}


        </div>
        {/* ===== END MOBILE & TABLET VIEW ===== */}

        {/* ===== DESKTOP VIEW (hidden on mobile/tablet) ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-stretch mt-2 w-full relative">

          {/* ==================== COLUMN 1: PRODUCT GALLERY (4 cols / ~33% width) ==================== */}
          <div className="lg:col-span-4 min-w-0 self-stretch">
            <div className="flex flex-col gap-3 sticky top-[118px] z-10">
              {/* Main Image Container with Zoom */}
              <div className="border border-gray-300 rounded-lg p-2 bg-white relative">
                <OfferRibbonBadge
                  offerName={highlightOffer?.offerName}
                  labelText={highlightOffer?.labelText}
                  labelColor={highlightOffer?.labelColor}
                />

                <div
                  className="relative aspect-square w-full px-4 flex items-center justify-center cursor-pointer"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => openLightbox(0)}
                  ref={zoomContainerRef}
                >
                  <img
                    src={resolveImagePath(mainImage)}
                    alt={product?.name || "Product"}
                    className="w-full h-full object-contain rounded-lg"
                    ref={imgRef}
                    onError={(e) => handleImageErrorFallback(e, mainImage)}
                  />
                  {showZoomLens && (
                    <div
                      className="absolute border-2 border-white bg-white bg-opacity-30 pointer-events-none"
                      style={{ width: '150px', height: '150px', left: 0, top: 0, borderRadius: '50%', transform: 'translateZ(0)', zIndex: 10 }}
                      ref={zoomLensRef}
                    />
                  )}
                </div>
                {showZoomLens && (
                  <div
                    className="absolute hidden md:block left-full ml-4 top-0 bg-no-repeat bg-white border rounded-lg overflow-hidden shadow-2xl"
                    style={{
                      backgroundImage: `url(${resolveImagePath(product?.images?.[selectedImageIndex])})`,
                      backgroundSize: '200%',
                      backgroundPosition: '50% 50%',
                      zIndex: 30, height: '400px', width: '525px'
                    }}
                    ref={zoomResultRef}
                  />
                )}
              </div>

              {/* Thumbnails Strip */}
              <ThumbnailStrip
                images={product.images}
                selectedImageIndex={selectedImageIndex}
                onSelect={setSelectedImageIndex}
                resolveImagePath={resolveImagePath}
                onError={handleImageErrorFallback}
              />



              {/* Lightbox Modal */}
              {lightboxOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto" onClick={closeLightbox}>
                  <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md sm:max-w-2xl mx-auto flex flex-col items-center max-h-[80vh] sm:max-h-[70vh] p-3 sm:p-6 mt-[10rem] sm:mt-32" onClick={(e) => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 z-50" onClick={closeLightbox}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="relative w-full flex items-center justify-center">
                      <img src={resolveImagePath(product?.images?.[selectedImageIndex])} alt={product?.name || "Product"} className="object-contain max-h-[60vh] sm:max-h-[50vh] w-full rounded-md" onError={(e) => handleImageErrorFallback(e, product?.images?.[selectedImageIndex])} />
                    </div>
                    <div className="w-full border-t border-gray-300 my-3"></div>
                    {product.images && product.images.filter(img => img && typeof img === "string" && img.trim() !== '' && img.trim().toLowerCase() !== 'null').length > 0 && (
                      <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
                        {product.images.filter(img => img && typeof img === "string" && img.trim() !== '' && img.trim().toLowerCase() !== 'null').map((image, index) => (
                          <img key={index} src={resolveImagePath(image)} alt={`Thumbnail ${index + 1}`}
                            className={`object-cover w-14 h-14 sm:w-16 sm:h-16 rounded-sm cursor-pointer hover:scale-105 ${selectedImageIndex === index ? 'ring-2 ring-red-500' : ''}`}
                            onClick={() => setSelectedImageIndex(index)}
                            onError={(e) => handleImageErrorFallback(e, image)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* ==================== RIGHT SIDE: COLUMNS 2 + 3 AREA (8 cols / ~67% width) ==================== */}
          <div className="lg:col-span-8 flex flex-col gap-4 min-w-0 self-stretch">
            <div className="grid grid-cols-8 gap-6 items-start">
              {/* ==================== COLUMN 2: PRODUCT INFORMATION & DETAILS (5 cols) ==================== */}
              <div className="col-span-5 flex flex-col gap-3 min-w-0">
                {/* 1. BREADCRUMBS AT TOP OF COLUMN 2 */}
                <ProductBreadcrumb product={product} className="mb-1 text-xs w-full overflow-hidden" />
                {/* Title */}
                <h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>

                {/* Stock Status & Product Code / SKU */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {isInStock ? (
                    isOnlineAvailable ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                        ✓ In Stock ({productQty} units)
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-300 px-2 py-0.5 rounded-full font-semibold">
                          Sold Out Online
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                          <FaStore className="w-3 h-3 text-emerald-600" /> Available in Store ({productQty} units)
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                      ✗ Out of Stock
                    </span>
                  )}
                  {(product.item_code || product.model_number) && (
                    <span className="text-gray-500 font-medium">
                      {product.item_code ? `(Product Code: ${product.item_code})` : ''} {product.model_number ? `| Model: ${product.model_number}` : ''}
                    </span>
                  )}
                </div>

                <ProductVariantSelector
                  variantGroup={product.variantGroup}
                  currentProductId={product._id}
                  onSelect={handleVariantSelect}
                />

                <div className="key-fea"></div>
                {isDesktop ? <FlixMinisiteSlot /> : null}

                {/* Rating & Reviews */}
                {avgRating > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-green-600 text-white font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      {avgRating} ★
                    </span>
                    <span className="text-gray-500 font-medium">({reviewCount} Verified Ratings & Reviews)</span>
                  </div>
                )}

                <ExchangeOfferSection
                  productCategory={product.sub_category_new_name ? product.sub_category_new_name.replace(/##/g, ",") : (product.categoryName || "")}
                  categoryId={product.category}
                  subCategoryId={product.sub_category}
                  sellingPrice={effectivePrice}
                  mrp={product.price + (isExtendedWarrantyEligible(product) ? (selectedWarrantyAmount || 0) : 0)}
                  onExchangeApply={handleExchangeApply}
                  onAvailabilityChange={setHasExchangeOffers}
                />

                {/* Price & Offer Block — Exist: LSP → special → MRP (Unilet skips LSP) */}
                <div className={`border-t border-b border-gray-200 py-3 my-1 ${hasExchangeOffers ? "hidden" : ""}`}>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-3xl font-black text-[#d72828]">
                      ₹ {Number(effectivePrice).toLocaleString('en-IN')}
                    </span>
                    {isExtendedWarrantyEligible(product) && selectedWarrantyAmount > 0 && (
                      <WarrantyBadge
                        selectedWarranty={selectedWarrantyData}
                        selectedWarrantyAmount={selectedWarrantyAmount}
                        onDeselect={handleDeselectWarranty}
                      />
                    )}
                    {mainDiscountInfo.showDiscount && (
                      <>
                        <span className="text-sm text-gray-400 line-through font-medium">
                          M.R.P: ₹ {Number(product.price + (isExtendedWarrantyEligible(product) ? (selectedWarrantyAmount || 0) : 0)).toLocaleString('en-IN')}
                        </span>
                        <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                          {mainDiscountInfo.discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {usingLspPrice ? "(Incl. all Taxes)" : "Inclusive of all taxes"}
                  </p>
                </div>

                {/* Payment Offers & Integrated EMI Component */}
                <PaymentOffers
                  product={product}
                  price={effectivePrice}
                  onOpenEmiModal={() => setIsEmiModalOpen(true)}
                  externalShowEmiModal={showEMIModal}
                  onExternalCloseEmiModal={() => setShowEMIModal(false)}
                  onAvailabilityChange={setHasPaymentOffers}
                />

                {/* Delivery Options & Badges Card (Screenshot Reference Exact Match) */}
                <div className="border border-gray-200 rounded-xl p-3.5 bg-white shadow-2xs mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Delivery Options:</span>
                    {!isEditingPincode ? (
                      <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1 bg-white shadow-2xs">
                        <IoLocationOutline className="text-gray-500 w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-gray-800">
                          {globalPincode || deliveryPincode || "600001"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPincode(true)}
                          className="text-xs font-bold text-[#d72828] hover:underline ml-1 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handlePincodeSubmit}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2 py-1 shadow-2xs"
                      >
                        <IoLocationOutline className="text-gray-500 w-3.5 h-3.5" />
                        <input
                          type="text"
                          value={deliveryPincode}
                          onChange={(e) =>
                            setDeliveryPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="Enter Pincode"
                          maxLength={6}
                          autoFocus
                          className="w-20 text-xs focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isCheckingDelivery}
                          className="text-xs font-bold text-[#d72828] hover:underline ml-1 cursor-pointer disabled:opacity-50"
                        >
                          {isCheckingDelivery ? "..." : "Check"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Regular Delivery | Store Pickup Split Box */}
                  <div className="border border-gray-200 rounded-lg grid grid-cols-2 divide-x divide-gray-200 bg-white mt-2.5">
                    <div className="p-2.5 text-center">
                      <span className="text-xs font-black text-gray-900 block tracking-tight">
                        REGULAR DELIVERY
                      </span>
                      <span
                        className={`text-[11px] font-medium block mt-0.5 ${isCheckingDelivery
                          ? "text-gray-500"
                          : deliveryInfo?.available === false
                            ? "text-red-600"
                            : "text-green-600"
                          }`}
                      >
                        {isCheckingDelivery
                          ? "Checking delivery..."
                          : deliveryInfo?.available === false
                            ? (deliveryInfo?.message || "Not Available for Delivery at Your Location")
                            : (deliveryInfo?.message || "Delivery in 2 Days")}
                      </span>
                    </div>
                    <div className="p-2.5 text-center">
                      <span className="text-xs font-black text-gray-900 block tracking-tight">
                        STORE PICKUP
                      </span>
                      <span
                        className={`text-[11px] font-medium block mt-0.5 ${isCheckingDelivery
                          ? "text-gray-500"
                          : deliveryInfo?.pickupAvailable === false || deliveryInfo?.available === false
                            ? "text-gray-400"
                            : "text-green-600"
                          }`}
                      >
                        {isCheckingDelivery
                          ? "Checking..."
                          : deliveryInfo?.isError
                            ? "Unable to check"
                            : deliveryInfo?.pickupAvailable === false || deliveryInfo?.available === false
                              ? (deliveryInfo?.pickupMessage || "Not Available")
                              : (deliveryInfo?.pickupMessage || "Reserve & Collect at Store")}
                      </span>
                    </div>
                  </div>

                  {/* GST Invoice & Genuine Badges (Inside Card 2) */}
                  <div className="flex items-center justify-between text-xs text-gray-600 mt-3 pt-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <IoCardOutline className="text-[#d72828] w-4 h-4 flex-shrink-0" />
                      <span>GST Invoice Available</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <IoShieldCheckmark className="text-green-600 w-4 h-4 flex-shrink-0" />
                      <span>100% Genuine Product</span>
                    </div>
                  </div>
                </div>

              </div>


              {/* ==================== COLUMN 3: FREQUENTLY BOUGHT TOGETHER & CTAS (3 cols) ==================== */}
              <div className="col-span-3 min-w-0">
                <div className="flex flex-col gap-2.5">

                  {/* 1. FREQUENTLY BOUGHT TOGETHER (EXACTLY 2 PRODUCTS, BACKEND CONTROLLED) - 1ST POSITION */}
                  {featuredProducts && featuredProducts.filter(item => item.stock_status === "In Stock").length > 0 && (
                    <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-3">
                      <h3 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-2 mb-3 uppercase tracking-wide">
                        Frequently Bought Together:
                      </h3>
                      <div className="space-y-3">
                        {featuredProducts.slice(0, 2).map((item, index) => (
                          <div key={item._id || index} className={`flex items-start gap-2.5 pb-2.5 border-b border-gray-100 last:border-0 ${(!isInStock || !isMovementAllowed) ? 'opacity-60' : ''}`}>
                            <input
                              type="checkbox"
                              className="mt-1 accent-[#d72828] cursor-pointer w-4 h-4 disabled:cursor-not-allowed disabled:opacity-50"
                              checked={(!isInStock || !isMovementAllowed) ? false : selectedFrequentProducts.some(p => p._id === item._id)}
                              onChange={() => {
                                if (isInStock && isMovementAllowed) toggleFrequentProduct(item);
                              }}
                              disabled={!isInStock || !isMovementAllowed}
                              title={!isInStock ? "Main product is out of stock" : !isMovementAllowed ? "Main product is sold out online" : ""}
                            />
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <img
                                src={resolveImagePath(item.images?.[0] || item.image)}
                                alt={item.name || "Product"}
                                className="w-12 h-12 object-contain flex-shrink-0 rounded border border-gray-200"
                                onError={(e) => handleImageErrorFallback(e, item.images?.[0] || item.image)}
                              />
                              <div className="text-xs flex-1 min-w-0">
                                <Link href={`/product/${item.slug}`} className="block hover:underline">
                                  <h4 className="font-medium text-gray-800 line-clamp-2 text-[11px] leading-snug">{item.name}</h4>
                                </Link>
                                <div className="flex flex-col mt-1">
                                  {getDiscountInfo(item?.price, resolveItemSellingPrice(item)).showDiscount && (
                                    <span className="text-[10px] text-gray-400 line-through">
                                      ₹ {Number(item?.price).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 text-[11px]">
                                    <span className="text-gray-500 font-medium">Buy Together for</span>
                                    <span className="font-bold text-[#d72828]">
                                      ₹ {Number(resolveItemSellingPrice(item)).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. PROTECTION / EXTENDED WARRANTY (MIDDLE OF COLUMN 3) */}
                  {warranties.length > 0 && isExtendedWarrantyEligible(product) && (
                    <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-3">
                      <div className="flex items-center gap-1.5 mb-2 border-b border-gray-200 pb-2">
                        <FaShield className="text-[#d72828] w-4 h-4" />
                        <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wide">
                          Want to protect your product?
                        </h3>
                      </div>

                      <div className="space-y-2 text-xs">
                        <label className="flex items-center justify-between p-1.5 rounded cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="warranty_desktop_col3"
                              checked={selectedWarrantyData === null}
                              onChange={() => {
                                setSelectedWarrantyData(null);
                                setSelectedWarrantyAmount(0);
                              }}
                              className="accent-[#d72828]"
                            />
                            <span className="text-gray-700">No Protection Plan</span>
                          </div>
                        </label>

                        {[...warranties]
                          .sort((a, b) => (a.year || 0) - (b.year || 0))
                          .map((w, index) => (
                            <label
                              key={w.item_no || index}
                              className="flex items-center justify-between p-1.5 border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="warranty_desktop_col3"
                                  checked={selectedWarrantyData?.item_no === w.item_no}
                                  onChange={() => {
                                    setSelectedWarrantyData(w);
                                    setSelectedWarrantyAmount(w.price);
                                  }}
                                  className="accent-[#d72828]"
                                />
                                <span className="text-gray-800 font-medium">{w.year} Year Warranty</span>
                              </div>
                              <span className="font-bold text-gray-900">₹ {w.price.toLocaleString("en-IN")}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 1. PRIMARY ACTION BUTTONS: BUY NOW & ADD TO CART (INSIDE COLUMN 3) */}
                  <div className="flex flex-col gap-2 bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    {/* Live Price Summary */}
                    <div className="pb-2 border-b border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 font-semibold">Total Price:</span>
                        <span className="font-extrabold text-base text-[#d72828]">
                          ₹ {Number(
                            (displaySellingPrice * (isInStock && isMovementAllowed ? quantity : 1)) +
                            (isInStock && isMovementAllowed && isExtendedWarrantyEligible(product) ? (selectedWarrantyAmount || 0) : 0)
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {isInStock && isMovementAllowed && isExtendedWarrantyEligible(product) && selectedWarrantyAmount > 0 && (
                        <span className="block text-[11px] text-gray-500 font-normal mt-0.5">
                          Includes ₹{Number(displaySellingPrice * quantity).toLocaleString("en-IN")} product + ₹{selectedWarrantyAmount.toLocaleString("en-IN")} warranty
                        </span>
                      )}
                    </div>

                    {/* Quantity selector (visible for online purchasable in-stock products only) */}
                    {isInStock && isMovementAllowed && !isOpenBox && (
                      <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded p-2 mb-1">
                        <span className="font-medium text-gray-700">Quantity:</span>
                        <div className="flex items-center border border-gray-300 bg-white rounded px-2 py-0.5 gap-3">
                          <button onClick={handleDecrease} className="text-gray-600 font-bold text-sm hover:text-[#d72828]">−</button>
                          <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                          <button onClick={handleIncrease} className="text-gray-600 font-bold text-sm hover:text-[#d72828]">+</button>
                        </div>
                      </div>
                    )}

                    {isInStock ? (
                        <>
                          {/* BUY NOW / Order Now / Get Offer / Call to Order */}
                          {isOpenBox ? (
                            <a
                              href={`tel:${CLEARANCE_PHONE}`}
                              className="flex items-center justify-center gap-3 w-full py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-md transition-all duration-200 cursor-pointer active:scale-95 text-center"
                              title="Call to Order Clearance Unit"
                            >
                              <FaPhoneAlt className="w-5 h-5 flex-shrink-0 text-white self-center" />
                              <div className="flex flex-col items-center text-center leading-tight">
                                <span className="text-sm font-extrabold uppercase tracking-wider">CALL TO ORDER</span>
                                <span className="text-[10px] font-medium opacity-90 tracking-wide mt-0.5">(CLEARANCE UNIT)</span>
                              </div>
                            </a>
                          ) : !isOnlineAvailable ? (
                            <button
                              type="button"
                              onClick={handleGetOffer}
                              className="w-full font-extrabold py-3 rounded-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-md transition-all bg-[#d72828] hover:bg-red-700 text-white cursor-pointer active:scale-95"
                            >
                              Get Offer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuyNow()}
                              className="w-full font-extrabold py-3 rounded-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-md transition-all bg-[#d72828] hover:bg-red-700 text-white cursor-pointer active:scale-95"
                            >
                              <FaStore className="w-4 h-4 flex-shrink-0" />
                              {isCusOrder ? "Order Now" : "Buy Now"}
                            </button>
                          )}

                          {/* ADD TO CART — CUS-Order / display_stock opens enquiry (Exist) */}
                          {(isOnlineAvailable || isOpenBox) && (
                          <ProductAddtoCart
                            productId={product._id}
                            stockQuantity={product.quantity}
                            quantity={quantity}
                            special_price={displaySellingPrice}
                            display_stock={product.display_stock}
                            additionalProducts={[...selectedFrequentProducts.map((p) => p._id), ...selectedRelatedProducts.map((p) => p._id)]}
                            extendedWarranty={isExtendedWarrantyEligible(product) ? selectedWarrantyAmount : 0}
                            selectedFrequentProducts={selectedFrequentProducts}
                            selectedRelatedProducts={selectedRelatedProducts}
                            warrantyData={isExtendedWarrantyEligible(product) ? selectedWarrantyData : null}
                            variantValues={currentVariantValues}
                            selectedVariant={currentVariantValues}
                            color={currentColor}
                            exchangeOffer={appliedExchangeOffer}
                            buttonLabel={isOpenBox ? "Enquire to Buy" : isCusOrder ? "Order Now" : "Add To Cart"}
                            buttonClassName="w-full border-2 border-[#d72828] text-[#d72828] hover:bg-red-50 font-bold py-2.5 rounded-lg text-sm transition-all shadow-none"
                            movement={product.movement}
                            productName={product.name}
                            productSlug={product.slug}
                            productCategory={
                              product.sub_category_new_name
                                ? String(product.sub_category_new_name).replace(/##/g, ",")
                                : product.categoryName || product.category_name || ""
                            }
                          />
                          )}
                        </>
                    ) : (
                      /* Out of Stock CTAs (Modern Croma/Flipkart e-commerce pattern) */
                      <div className="flex flex-col gap-2 pt-0.5">
                        {/* Currently Out of Stock grey badge */}
                        <div className="w-full bg-gray-200 text-gray-700 font-extrabold py-3 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-not-allowed select-none border border-gray-300">
                          Currently Out of Stock
                        </div>

                        {/* 🔔 Notify Me When Available Button */}
                        <button
                          type="button"
                          onClick={handleNotifyMe}
                          disabled={notifyMeSuccess}
                          className={`w-full font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer ${
                            notifyMeSuccess
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm active:scale-95"
                          }`}
                        >
                          <FaBell className="w-3.5 h-3.5" />
                          {notifyMeSuccess ? "Notification Registered ✓" : "Notify Me When Available"}
                        </button>

                        {/* View Similar Products Smooth Scroll Button */}
                        <button
                          type="button"
                          onClick={scrollToRelatedProducts}
                          className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer mt-0.5"
                        >
                          <span>View Similar Products</span>
                          <span className="text-[12px] font-bold text-[#d72828]">↓</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. ACTIONS BAR: Share | Compare | Wishlist (Clean single-line alignment) */}
                  <div className="flex items-center justify-between border border-gray-200 py-2 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg gap-1.5 sm:gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={handleShareProduct}
                      className="flex items-center gap-1.5 hover:text-[#d72828] transition cursor-pointer shrink-0"
                    >
                      <FaShareAlt className="text-gray-500 w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Share</span>
                    </button>
                    <span className="text-gray-300 select-none shrink-0">|</span>
                    <CompareButton
                      product={product}
                      variant="text"
                      iconSize={14}
                      label="Compare"
                      activeLabel="In Compare"
                      className="flex items-center gap-1.5 hover:text-[#d72828] transition bg-transparent p-0 border-0 shadow-none text-xs sm:text-sm text-gray-700 font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    />
                    <span className="text-gray-300 select-none shrink-0">|</span>
                    <AddToWishlistButton
                      productId={product._id}
                      label="Wishlist"
                      iconSize={14}
                      className="flex items-center gap-1.5 hover:text-[#d72828] transition bg-transparent p-0 border-0 shadow-none text-xs sm:text-sm text-gray-700 font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    />
                  </div>

                  {/* 5. LIVE MARKET PRICE COMPARISON (ePrice Tracker™) — lsp_pdp_live_comparison */}
                  {lspPdpEnabled ? <CompetitorPriceTracker product={product} /> : null}

                </div>
              </div>

            </div>

            {/* ==================== EXTENDED WARRANTY & INSTALLATION (Spans Columns 2 + 3) ==================== */}
            <ProductInstallationWarrantySection
              product={product}
              warranties={warranties}
              selectedWarrantyData={selectedWarrantyData}
              onSelectWarranty={handleSelectWarranty}
              className="mt-1"
            />
          </div>

        </div>
        {/* END DESKTOP VIEW GRID */}

        {/* DESKTOP FULL-WIDTH PRODUCT DETAILS & SPECIFICATIONS SECTION */}
        <div className="hidden lg:block w-full mt-8">
          <ProductDetailsSection
            key={`desktop-${product._id}`}
            product={product}
            reviews={reviews}
            avgRating={avgRating}
            reviewCount={reviewCount}
            manufacturerName={matchedBrandForManufacturer?.manufacturer_name}
            manufacturerAddress={matchedBrandForManufacturer?.manufacturer_address}
            flixInstanceActive={isDesktop}
            flixInpageAvailable={flixInpageAvailable}
          />
        </div>




        <RelatedProducts
          relatedProducts={product?.related_products}
          currentProductId={product?._id}
          categoryId={product?.category}
          brandId={product?.brand}
          region={globalRegion}
        />
        <RecentlyViewedProducts products={recentlyViewedProducts} />
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        product={product}
      />

      {/* Lazy-Loaded Isolated EMI Options Modal (Razorpay Style) */}
      <EmiModal
        isOpen={isEmiModalOpen}
        onClose={() => setIsEmiModalOpen(false)}
        price={effectivePrice}
        productName={product?.name}
      />

      {showLowStockEnquiry && (
        <LowStockEnquiryPopup
          onClose={() => setShowLowStockEnquiry(false)}
          productName={product?.name}
          productSlug={product?.slug}
          productCategory={
            product?.sub_category_new_name
              ? String(product.sub_category_new_name).replace(/##/g, ",")
              : product?.categoryName || product?.category_name || ""
          }
          stockQuantity={productQty}
          variant={enquiryVariant}
        />
      )}
    </div>
  );
}


