"use client";
import {
  FaShoppingCart,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaShareAlt,
} from "react-icons/fa";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useModal } from "@/context/ModalContext";
import { ToastContainer, toast } from "react-toastify";
import { useHeaderdetails } from "@/context/HeaderContext";
import { trackAddToCart, ga4AddToCart } from "@/utils/nextjs-event-tracking";
import { ADD_CART_ALLOWED_MOVEMENTS, isMovementAllowed } from "@/lib/addCartConfig";
import OpenBoxPopup from "@/components/OpenBoxPopup";

import { v4 as uuidv4 } from "uuid";
import { useRegion } from "@/context/RegionContext";

const AddToCartButton = ({
  productId,
  quantity = 1,
  warranty,
  additionalProducts = [],
  extendedWarranty,
  selectedFrequentProducts = [],
  stockQuantity = 1,
  special_price,
  movement,
  productName,
  productSlug,
  className = "",
  checkMovement = false,
}) => {
  const { openAuthModal } = useModal();
  const { updateHeaderdetails, setIsLoggedIn, setUserData, setIsAdmin, userData } =
    useHeaderdetails();
  const [isLoading, setIsLoading] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  // const [showAuthModal, setShowAuthModal] = useState(false);
  // const [authError, setAuthError] = useState('');
  const qty = Number(stockQuantity ?? 0);
  const isOutOfStock = qty <= 0;
  const isOpenBox =
    !checkMovement &&
    (movement === "FOCUS" || movement === "EOL") && qty < 10;
  const [showOpenBoxPopup, setShowOpenBoxPopup] = useState(false);
  // const isprice = special_price <= 0;
  const { cartCount, updateCartCount } = useCart();
  const { pincode: headerPincode, userLocation, region: currentRegion } = useRegion();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    if (checkMovement && qty < 10) {
      let currentMovement = movement;
      try {
        const res = await fetch(
          `/api/product/by-ids?ids=${encodeURIComponent(productId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data?.products?.[0]) currentMovement = data.products[0].movement;
      } catch {}
      if (!isMovementAllowed(currentMovement)) {
        toast.error("Sold Out Online - Available in Store");
        return;
      }
    }
    if (isOpenBox) {
      if (productSlug) {
        // Check if we're already on the product detail page
        const isOnProductPage =
          window.location.pathname === `/product/${productSlug}`;
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
    //  if(isprice){
    //   return;
    //  }
    setIsLoading(true);
    // setAuthError('');
    setCartSuccess(false);

    try {
      const token = localStorage.getItem("token");
      const isLoggedIn = Boolean(token);
      let guestCartId = null;
      if (!token) {
        guestCartId = localStorage.getItem("guestCartId") || uuidv4();
        localStorage.setItem("guestCartId", guestCartId);
      }

      // ✅ Add main product to cart in a single direct API request
      const effectiveGuestCartId = guestCartId || (typeof window !== "undefined" ? localStorage.getItem("guestCartId") : null);
      const effectivePincode = headerPincode || userLocation?.pincode || "";
      const effectiveUserState = userLocation?.stateName || userLocation?.state || (currentRegion === "karnataka" ? "Karnataka" : "Tamil Nadu");
      const effectiveRegion = currentRegion || userLocation?.region || (effectiveUserState === "Karnataka" ? "karnataka" : "tamilnadu");

      const cartResponse = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(effectiveGuestCartId && { guestCartId: effectiveGuestCartId }),
        },
        body: JSON.stringify({
          productId,
          original_prod_quantity: stockQuantity,
          quantity,
          selectedWarranty: warranty,
          selectedExtendedWarranty: extendedWarranty,
          guestCartId: effectiveGuestCartId || undefined,
          pincode: effectivePincode,
          userState: effectiveUserState,
          region: effectiveRegion,
        }),
      });

      if (cartResponse.status == 409) {
        toast.error("Stock limit exceeded!");
        return;
      }

      if (!cartResponse.ok) {
        const errData = await cartResponse.json().catch(() => ({}));
        const errMsg = errData.error || "Failed to add to cart";
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      toast.success("Product added!");

      // ✅ Add additional products (if any)
      if (additionalProducts.length > 0) {
        await Promise.all(
          additionalProducts.map(async (additionalId) => {
            const res = await fetch("/api/cart", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
                ...(effectiveGuestCartId && { guestCartId: effectiveGuestCartId }),
              },
              body: JSON.stringify({
                productId: additionalId,
                quantity: 1,
                guestCartId: effectiveGuestCartId || undefined,
              }),
            });
            if (!res.ok) throw new Error("Failed to add additional product");
          }),
        );
      }

      const responseData = await cartResponse.json();
      if (responseData.guestCartId && typeof window !== "undefined") {
        localStorage.setItem("guestCartId", responseData.guestCartId);
      }
      console.log("📦 responseData:", responseData);
      const totalItemsCount =
        (responseData?.cart?.totalItems != null
          ? responseData.cart.totalItems
          : 1) + additionalProducts.length;
      updateCartCount(totalItemsCount);
      console.log("🔔 About to call ga4AddToCart");

      // Extract resolved product fields safely from response and props
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

      // ✅ GA4 add_to_cart (strictly isolated)
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

      // ✅ Email marketing track (logged-in only, strictly isolated)
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
          console.warn("Email marketing tracking error:", trackErr);
        }
      }

      // ✅ Store frequently bought together
      if (selectedFrequentProducts?.length > 0) {
        const ids = selectedFrequentProducts.map((p) => p._id);
        localStorage.setItem("selectedFrequentProductIds", JSON.stringify(ids));
      } else {
        localStorage.removeItem("selectedFrequentProductIds");
      }

      setCartSuccess(true);
      setTimeout(() => {
        setCartSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Add to cart error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const sizeClass = className || "w-full min-[1400px]:w-[185px]";

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
      <button
        onClick={handleAddToCart}
        disabled={isLoading || isOutOfStock}
        className={`px-2 py-2 md:px-2 md:py-2 mr-1 rounded-md shadow-md transition duration-300 text-md flex items-center justify-center gap-x-1
    ${
      isOutOfStock
        ? "bg-gray-400 cursor-not-allowed text-white"
        : isLoading
        ? "bg-[#d72828] cursor-not-allowed opacity-75"
        : cartSuccess
        ? "bg-green-500 text-white hover:bg-green-600"
        : "bg-white text-[#d72828] hover:bg-[#d72828] hover:text-white"
    }
    active:scale-95 disabled:active:scale-100
    ${sizeClass}`}
        style={{
          boxShadow:
            "rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset",
        }}
      >
        {isOutOfStock ? (
          <span>Out of Stock</span>
        ) : isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
        ) : (
          <>
            {/* <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>  */}

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 32 32"
              fill="currentColor"
            >
              <defs></defs>
              <g id="cart">
                <path
                  className="cls-1"
                  d="M29.46 10.14A2.94 2.94 0 0 0 27.1 9H10.22L8.76 6.35A2.67 2.67 0 0 0 6.41 5H3a1 1 0 0 0 0 2h3.41a.68.68 0 0 1 .6.31l1.65 3 .86 9.32a3.84 3.84 0 0 0 4 3.38h10.37a3.92 3.92 0 0 0 3.85-2.78l2.17-7.82a2.58 2.58 0 0 0-.45-2.27zM28 11.86l-2.17 7.83A1.93 1.93 0 0 1 23.89 21H13.48a1.89 1.89 0 0 1-2-1.56L10.73 11H27.1a1 1 0 0 1 .77.35.59.59 0 0 1 .13.51z"
                />
                <circle className="cls-1" cx="14" cy="26" r="2" />
                <circle className="cls-1" cx="24" cy="26" r="2" />
              </g>
            </svg>

            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Add</span>
          </>
        )}
      </button>
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
