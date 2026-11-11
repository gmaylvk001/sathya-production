// utils/tracking.js
"use client";
// ─── GA4 Ecommerce Helpers ───────────────────────────────────────────────────

export const ga4AddToCart = ({ product } = {}) => {
  try {
    console.log("🛒 ga4AddToCart called", product);
    if (typeof window !== "undefined" && window.gtag) {
      console.log("✅ gtag exists, firing add_to_cart");
      window.gtag("event", "add_to_cart", {
        currency: "INR",
        value: product?.price || 0,
        items: [
          {
            item_id: product?.id,
            item_name: product?.name || "Product",
            price: product?.price || 0,
            quantity: product?.qty || 1,
          },
        ],
      });
    } else {
      console.warn("❌ gtag not found on window");
    }
  } catch (err) {
    console.warn("ga4AddToCart error:", err);
  }
};

export const ga4BeginCheckout = ({ items, value }) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "begin_checkout", {
      currency: "INR",
      value: value,
      items: items.map((item) => ({
        item_id: item.productId || item._id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    });
  }
};

export const ga4Purchase = ({ orderId, value, items }) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "purchase", {
      transaction_id: orderId,
      currency: "INR",
      value: value,
      items: items.map((item) => ({
        item_id: item.productId || item._id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    });
  }
};

// ─── Email Marketing (_em_event) Helpers ────────────────────────────────────

/* export const trackAddToCart = ({  user, product }) => {
  console.log("Its now come in for user :",user);
  console.log("Its now come in :",product);
  console.log("type_of",window);
  if (typeof window !== "undefined" && window._em_event) {
    console.log("type_of",window._em_event);
    window._em_event.track({
      event: "btnClick",
      action: "addToCart",
      user_info: {
        user_name:  user?.name,
        phone:  user?.mobile,
        email:  user?.email,
      },
      product_info: {
        product_id: product?.id,
        product_name: product?.name,
        price: product?.price,
        product_link: product?.link,
        image: product?.image,
        qty: product?.qty,
        currency: product?.currency || "INR",
      },
    });
  } else {
    console.warn("Event tracking not loaded yet");
  }
}; */

export const trackAddToCart = (payload = {}) => {
  try {
    const user = payload.user || payload.user_info || {};
    const product = payload.product || payload.product_info || {};
    if (
      typeof window !== "undefined" &&
      window._em_event &&
      typeof window._em_event.track === "function"
    ) {
      window._em_event.track({
        event: "btnClick",
        action: "addToCart",
        user_info: {
          user_name: user?.name || user?.user_name || "",
          phone: user?.mobile || user?.phone || "",
          email: user?.email || "",
        },
        product_info: {
          product_id: product?.id || product?.product_id || "",
          product_name: product?.name || product?.product_name || "",
          price: product?.price != null ? product.price : 0,
          product_link: product?.link || product?.product_link || "",
          image: product?.image || "",
          qty: product?.qty || product?.quantity || 1,
          currency: product?.currency || "INR",
        },
      });
    } else {
      console.warn("Adtarbo not loaded yet");
    }
  } catch (err) {
    console.warn("trackAddToCart error:", err);
  }
};

export const trackCheckout = ({  user, product }) => {
  if (typeof window !== "undefined" && window._em_event) {
    window._em_event.track({
      event: "btnClick",
      action: "checkOut",
      user_info: {
         user_name:  user?.name,
        phone:  user?.phone,
        email:  user?.email,
      },
      product_info: {
        product_id: product?.id,
        product_name: product?.name,
        price: product?.price,
        product_link: product?.link,
        image: product?.image,
        qty: product?.qty,
        currency: product?.currency || "INR",
      },
    });
  } else {
    console.warn("Event tracking not loaded yet");
  }
};