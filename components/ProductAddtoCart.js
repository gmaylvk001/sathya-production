"use client";
import { FaPhoneAlt, FaEnvelope, FaTimes, FaShareAlt } from "react-icons/fa";
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';
import { useHeaderdetails } from '@/context/HeaderContext';
import { ToastContainer, toast } from 'react-toastify';
import { trackAddToCart, ga4AddToCart } from "@/utils/nextjs-event-tracking.js";

import { FaShoppingCart } from "react-icons/fa";
import { isOpenBoxEligible } from "@/lib/openBoxHelper";
import OpenBoxPopup from "@/components/OpenBoxPopup";
import LowStockEnquiryPopup, {
  ENQUIRY_VARIANT_NORMAL,
  ENQUIRY_VARIANT_CUSORDER,
  isCusOrderMovement,
} from "@/components/LowStockEnquiryPopup";

import { v4 as uuidv4 } from "uuid";
import { useRegion } from "@/context/RegionContext";

const AddToCartButton = ({ productId, quantity = 1, warranty, additionalProducts = [], extendedWarranty, selectedFrequentProducts = [], stockQuantity = 1, special_price, display_stock, onSuccess, buttonLabel, buttonClassName, movement, productName, productSlug, productCategory = "", warrantyData, variantValues, selectedVariant, color, exchangeOffer = null }) => {
  const { openAuthModal } = useModal();
  const { updateHeaderdetails, setIsLoggedIn, setUserData, setIsAdmin, userData } = useHeaderdetails();
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [authError, setAuthError] = useState('');
  const [cartSuccess, setCartSuccess] = useState(false);
  const [showOpenBoxPopup, setShowOpenBoxPopup] = useState(false);
  const [showLowStockEnquiry, setShowLowStockEnquiry] = useState(false);
  const [enquiryVariant, setEnquiryVariant] = useState(ENQUIRY_VARIANT_NORMAL);
  const isOutOfStock = stockQuantity <= 0;
  const isprice = special_price <= 0;
  const isOpenBox = isOpenBoxEligible({ movement, quantity: stockQuantity });
  const isCusOrder = isCusOrderMovement(movement);
  // Exist: CUS-Order → always cusorder modal; else display_stock=yes → normal modal
  const isDisplayStockEnquiry = String(display_stock || "").toLowerCase() === "yes";
  const { cartCount, updateCartCount } = useCart();
  const { pincode: headerPincode, userLocation, region: currentRegion } = useRegion();

  const openEnquiryOnProductPage = (variant) => {
    const isOnProductPage =
      typeof window !== "undefined" &&
      productSlug &&
      window.location.pathname === `/product/${productSlug}`;
    if (productSlug && !isOnProductPage) {
      window.location.href = `/product/${productSlug}`;
      return;
    }
    setEnquiryVariant(variant);
    setShowLowStockEnquiry(true);
  };

  const handleAddToCart = async () => {
     if (isOutOfStock) return;

     if(isprice){
      return;
     }
      if (isOpenBox) {
  if (productSlug) {
    // Check if we're already on the product detail page
    const isOnProductPage = window.location.pathname === `/product/${productSlug}`;
    if (isOnProductPage) {
      setShowOpenBoxPopup(true);
    } else {
      window.location.href = `/product/${productSlug}`;
    }
  } else {
    setShowOpenBoxPopup(true);
  }
  return;
}
      // Exist blade: CUS-Order ATC / Order Now → #displayStockModal_cusorder
      if (isCusOrder) {
        openEnquiryOnProductPage(ENQUIRY_VARIANT_CUSORDER);
        return;
      }
      // Exist: display_stock == 'yes' → #displayStockModal (do not add to cart yet)
      if (isDisplayStockEnquiry) {
        openEnquiryOnProductPage(ENQUIRY_VARIANT_NORMAL);
        return;
      }
      setIsLoading(true);
      // setAuthError('');
      setCartSuccess(false);
      
      try {
        const token = localStorage.getItem('token');
        const isLoggedIn = Boolean(token);
        let guestCartId = null;
        if (!token) {
          guestCartId = localStorage.getItem("guestCartId") || uuidv4();
          localStorage.setItem("guestCartId", guestCartId);
        }

        const formattedWarranty = warrantyData ? {
          item_no: warrantyData.item_no || null,
          name: warrantyData.name || warrantyData.title || (warrantyData.year ? `${warrantyData.year} Year Extended Warranty` : "Extended Warranty"),
          title: warrantyData.title || warrantyData.name || (warrantyData.year ? `${warrantyData.year} Year Extended Warranty` : "Extended Warranty"),
          year: Number(warrantyData.year || warranty || 0),
          duration: warrantyData.duration || (warrantyData.year ? `${warrantyData.year} Year` : ""),
          price: Number(extendedWarranty || warrantyData.price || warrantyData.amount || 0),
        } : null;

        const effectivePincode = headerPincode || userLocation?.pincode || "";
        const effectiveUserState = userLocation?.stateName || userLocation?.state || (currentRegion === "karnataka" ? "Karnataka" : "Tamil Nadu");
        const effectiveRegion = currentRegion || userLocation?.region || (effectiveUserState === "Karnataka" ? "karnataka" : "tamilnadu");

        // ✅ Add main product to cart in a single direct API call with region and pincode
        const cartResponse = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            productId,
            original_prod_quantity: stockQuantity,
            quantity,
            selectedWarranty: Number(warranty || warrantyData?.year || 0),
            selectedExtendedWarranty: Number(extendedWarranty || warrantyData?.amount || warrantyData?.price || 0),
            warrantyData: formattedWarranty,
            variantValues: variantValues || selectedVariant || undefined,
            selectedVariant: selectedVariant || variantValues || undefined,
            color: color || undefined,
            ...(exchangeOffer ? { exchangeOffer } : {}),
            guestCartId: guestCartId || undefined,
            pincode: effectivePincode,
            userState: effectiveUserState,
            region: effectiveRegion,
          }),
        });

        if(cartResponse.status == 409) {
          toast.error("Stock limit exceeded!");
          return;
        }
    
        if (!cartResponse.ok) {
          const errData = await cartResponse.json().catch(() => ({}));
          const errMsg = errData.error || 'Failed to add to cart';
          toast.error(errMsg);
          throw new Error(errMsg);
        }

        toast.success("Product added!");
        
        // console.log(cartResponse);
        // Add additional products if any
        /*
        if (additionalProducts.length > 0) {
          await Promise.all(
            additionalProducts.map(async (additionalId) => {
              const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId: additionalId, quantity: 1 }),
              });
              if (!res.ok) throw new Error('Failed to add additional product');
            })
          );
        }
          */

        if (additionalProducts.length > 0) {
          await Promise.all(
            additionalProducts.map(async (additionalId) => {
              const res = await fetch("/api/cart", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(isLoggedIn && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                  productId: additionalId,
                  quantity: 1,
                  ...(guestCartId && { guestCartId }),
                }),
              });
              if (!res.ok) throw new Error("Failed to add additional product");
            })
          );
        }
  
        const responseData = await cartResponse.json();
        const totalItemsCount =
          (responseData?.cart?.totalItems != null
            ? responseData.cart.totalItems
            : 1) + additionalProducts.length;
        updateCartCount(totalItemsCount);

        // Find added item safely
        const addedItem =
          responseData?.cart?.items?.find(
            (item) =>
              (item?.productId?._id || item?.productId)?.toString() ===
              productId?.toString()
          ) ||
          responseData?.cart?.items?.[responseData?.cart?.items?.length - 1] ||
          responseData?.cart?.items?.[0] ||
          {};

        const resolvedName = productName || addedItem.name || "Product";
        const resolvedPrice =
          Number(special_price) > 0
            ? Number(special_price)
            : Number(addedItem.price) || 0;
        const resolvedSlug = productSlug || productId;
        const resolvedQty = Number(quantity) || Number(addedItem.quantity) || 1;
        const resolvedImage = addedItem.image
          ? addedItem.image.startsWith("http")
            ? addedItem.image
            : `${apiUrl || ""}/uploads/products/${addedItem.image}`
          : `${apiUrl || ""}/uploads/sathya-header-logo.webp`;

        // ✅ GA4 Tracking (strictly isolated)
        try {
          ga4AddToCart({
            product: {
              id: productId,
              name: resolvedName,
              price: resolvedPrice,
              qty: resolvedQty,
            },
          });
        } catch (trackErr) {
          console.warn("GA4 tracking error:", trackErr);
        }

        // ✅ Track events (skip if guest, strictly isolated)
        if (isLoggedIn) {
          try {
            const currentStoredUser =
              userData ||
              (typeof window !== "undefined"
                ? JSON.parse(
                    localStorage.getItem("userData") ||
                      localStorage.getItem("user") ||
                      "null"
                  )
                : null);

            trackAddToCart({
              user: {
                name: currentStoredUser?.name,
                mobile: currentStoredUser?.mobile || currentStoredUser?.phone,
                email: currentStoredUser?.email,
              },
              product: {
                id: productId,
                name: addedItem.name || resolvedName,
                price: addedItem.price != null ? addedItem.price : resolvedPrice,
                link: `${apiUrl || ""}/product/${resolvedSlug}`,
                image: resolvedImage,
                qty: addedItem.quantity || resolvedQty,
                currency: "INR",
              },
            });
          } catch (trackErr) {
            console.warn("trackAddToCart error:", trackErr);
          }
        }
        
        // ✅ Store selected product IDs for persistence
        if (selectedFrequentProducts?.length > 0) {
          const ids = selectedFrequentProducts.map(p => p._id);
          localStorage.setItem("selectedFrequentProductIds", JSON.stringify(ids));
        } else {
          localStorage.removeItem("selectedFrequentProductIds");
        }
  
        setCartSuccess(true);
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error('Add to cart error:', error);
        setAuthError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
  const isDefaultCartLabel = !buttonLabel || /add\s*to\s*cart/i.test(buttonLabel);
  const resolvedButtonLabel = isOpenBox
    ? (isDefaultCartLabel ? "Enquire to Buy" : buttonLabel)
    : isCusOrder
      ? (isDefaultCartLabel ? "Order Now" : buttonLabel)
      : (buttonLabel || "Add to Cart");

  const resolvedButtonClass = isOpenBox
    ? 'w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-sm border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50/50 bg-white transition-all cursor-pointer shadow-xs active:scale-95'
    : (buttonClassName || 'bg-white hover:bg-[#d72828] hover:text-white text-[#d72828] border border-red-200');

  return (
    <>
      
      {showOpenBoxPopup && (
      <OpenBoxPopup
        onClose={() => setShowOpenBoxPopup(false)}
        productName={productName}
        productSlug={productSlug}
        stockQuantity={stockQuantity}
      />
    )}
    {showLowStockEnquiry && (
      <LowStockEnquiryPopup
        onClose={() => setShowLowStockEnquiry(false)}
        productName={productName}
        productSlug={productSlug}
        productCategory={productCategory}
        stockQuantity={stockQuantity}
        variant={enquiryVariant}
      />
    )}
    {stockQuantity > 0 && (
<button
  onClick={handleAddToCart}
  disabled={isLoading || isOutOfStock || isprice}
  className={`w-full px-4 py-2.5 rounded-md transition duration-300 flex items-center justify-center gap-2 text-center
    ${buttonClassName
      ? 'font-medium text-sm'
      : 'shadow-md text-md gap-x-3 font-semibold'}
    ${isOutOfStock
      ? 'bg-gray-400 cursor-not-allowed text-white'
      : isLoading
        ? 'bg-[#d72828] cursor-not-allowed opacity-75 text-white'
        : cartSuccess
          ? 'bg-green-500 text-white hover:bg-green-600'
          : resolvedButtonClass}
    active:scale-95 disabled:active:scale-100`}
>
  {isOutOfStock ? (
    <span>Out of Stock</span>
  ) : isLoading ? (
    <>
      <svg
        className="animate-spin h-5 w-5"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="hidden sm:inline">Adding...</span>
    </>
  ) : cartSuccess ? (
    <>
      <FaShoppingCart />
      <span className="hidden sm:inline">Added to Cart</span>
      <span className="sm:hidden">Added</span>
    </>
  ) : isOpenBox ? (
    <div className="flex items-center justify-center gap-2">
      <FaPhoneAlt className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 self-center" />
      <span>{resolvedButtonLabel}</span>
    </div>
  ) : (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
      <span>{resolvedButtonLabel}</span>
    </>
  )}
</button>
)}


{/* 
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            handleAddToCart();
          }}
          error={authError}
        />
      )} */}
    </>
  );
};

export default AddToCartButton;