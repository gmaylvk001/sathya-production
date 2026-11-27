/**
 * Universal Cart & Checkout coupon eligibility and discount math helpers.
 */

export const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

export const resolveCartItemId = (item) => {
  if (!item) return "";
  if (typeof item.productId === "object" && item.productId?._id) {
    return String(item.productId._id);
  }
  if (item.productId) return String(item.productId);
  if (item.comboId) return String(item.comboId);
  return String(item.id || item._id || item.item_code || "");
};

export const resolveCartItemCategoryIds = (item) => {
  const ids = [];
  const pushVal = (v) => {
    if (!v) return;
    if (typeof v === "object" && v._id) ids.push(String(v._id));
    else ids.push(String(v));
  };
  pushVal(item?.category);
  pushVal(item?.sub_category);
  pushVal(item?.category_new);
  pushVal(item?.sub_category_new);
  if (item?.productId && typeof item.productId === "object") {
    pushVal(item.productId.category);
    pushVal(item.productId.sub_category);
  }
  return [...new Set(ids.filter(Boolean))];
};

export const getCartItemLinePrice = (item) => {
  const unit = Number(item?.price > 0 ? item.price : item?.actual_price) || 0;
  const qty = Math.max(1, Number(item?.quantity) || 1);
  return unit * qty;
};

export const getCartSubtotalForCoupon = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + getCartItemLinePrice(item), 0);
};

export const getEligibleCartItems = (coupon, items = []) => {
  if (!coupon || !Array.isArray(items) || !items.length) return [];

  const prodScope = Array.isArray(coupon.offer_product)
    ? coupon.offer_product.map(String).filter(Boolean)
    : [];
  const catScope = Array.isArray(coupon.offer_category)
    ? coupon.offer_category.map(String).filter(Boolean)
    : [];
  const itemCodeScope = String(coupon.item_code || "").trim().toLowerCase();
  const scopeMode = String(coupon.offer_product_category || "").trim().toLowerCase();

  if (scopeMode === "category" && catScope.length > 0) {
    return items.filter((it) => {
      const catIds = resolveCartItemCategoryIds(it);
      return catIds.some((cid) => catScope.includes(cid));
    });
  }

  if ((scopeMode === "product" || prodScope.length > 0) && prodScope.length > 0) {
    return items.filter((it) => {
      const pid = resolveCartItemId(it);
      const code = String(it?.item_code || "").trim().toLowerCase();
      return prodScope.includes(pid) || (code && prodScope.map((x) => x.toLowerCase()).includes(code));
    });
  }

  if (itemCodeScope) {
    return items.filter(
      (it) => String(it?.item_code || "").trim().toLowerCase() === itemCodeScope
    );
  }

  return items;
};

export const evaluateCouponDiscount = (coupon, items = []) => {
  if (!coupon || !Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      eligibleItems: [],
      cartSubtotal: 0,
      eligibleSubtotal: 0,
      discountAmount: 0,
      error: "Add at least one item to your cart to apply a coupon.",
    };
  }

  const cartSubtotal = getCartSubtotalForCoupon(items);
  const eligibleItems = getEligibleCartItems(coupon, items);
  if (!eligibleItems.length) {
    return {
      valid: false,
      eligibleItems: [],
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      error: "This coupon is not applicable to the items currently in your cart.",
    };
  }

  const eligibleSubtotal = getCartSubtotalForCoupon(eligibleItems);
  const minOrderAmount = Number(coupon.minOrderAmount ?? coupon.cart_value ?? 0) || 0;
  if (minOrderAmount > 0 && eligibleSubtotal < minOrderAmount) {
    const shortfall = Math.max(1, Math.ceil(minOrderAmount - eligibleSubtotal));
    return {
      valid: false,
      eligibleItems,
      cartSubtotal,
      eligibleSubtotal,
      discountAmount: 0,
      error: `Minimum order of ₹${minOrderAmount.toLocaleString("en-IN")} required (add ₹${shortfall.toLocaleString("en-IN")} more).`,
    };
  }

  let totalDiscount = 0;
  const pct = Number(coupon.percentage || 0) || 0;
  const fixed = Number(coupon.fixed_price || 0) || 0;

  if (coupon.offer_type === "percentage" && pct > 0) {
    totalDiscount = eligibleSubtotal * (pct / 100);
  } else if (fixed > 0) {
    totalDiscount = fixed;
  }

  totalDiscount = Math.min(totalDiscount, eligibleSubtotal);
  totalDiscount = Number(totalDiscount.toFixed(2));

  if (!(totalDiscount > 0)) {
    return {
      valid: false,
      eligibleItems,
      cartSubtotal,
      eligibleSubtotal,
      discountAmount: 0,
      error: "This coupon provides no discount on your current cart.",
    };
  }

  return {
    valid: true,
    eligibleItems,
    cartSubtotal,
    eligibleSubtotal,
    discountAmount: totalDiscount,
    error: "",
  };
};

export const applyDiscountToItems = (coupon, items = []) => {
  if (!Array.isArray(items)) return [];
  if (!coupon) {
    return items.map((i) => ({ ...i, discount: 0, coupondetails: [] }));
  }

  const evaluation = evaluateCouponDiscount(coupon, items);
  if (!evaluation.valid) {
    return items.map((i) => ({ ...i, discount: 0, coupondetails: [] }));
  }

  const { eligibleItems, eligibleSubtotal, discountAmount } = evaluation;
  const eligibleIds = new Set(eligibleItems.map((it) => resolveCartItemId(it)));

  let distributed = 0;
  const distributedItems = items.map((item) => {
    const pid = resolveCartItemId(item);
    if (!eligibleIds.has(pid) || eligibleSubtotal <= 0 || discountAmount <= 0) {
      return { ...item, discount: 0, coupondetails: [] };
    }
    const base = getCartItemLinePrice(item);
    const share = (base / eligibleSubtotal) * discountAmount;
    const discount = Number(share.toFixed(2));
    distributed += discount;
    return {
      ...item,
      discount,
      coupondetails: discount > 0 ? [coupon] : [],
    };
  });

  const eligibleIndexes = distributedItems
    .map((it, idx) => (eligibleIds.has(resolveCartItemId(it)) ? idx : -1))
    .filter((idx) => idx !== -1);
  const drift = Number((discountAmount - distributed).toFixed(2));
  if (eligibleIndexes.length && Math.abs(drift) >= 0.01) {
    const lastIdx = eligibleIndexes[eligibleIndexes.length - 1];
    distributedItems[lastIdx] = {
      ...distributedItems[lastIdx],
      discount: Number((distributedItems[lastIdx].discount + drift).toFixed(2)),
    };
  }

  return distributedItems;
};
