import Offer from "@/models/ecom_offer_info";
import CouponNew from "@/models/coupon_new";
import OrderNew from "@/models/orders_new";
import Product from "@/models/product";
import {
  evaluateCouponDiscount,
  normalizeCouponCode,
  resolveCartItemId,
} from "@/lib/cart/couponMath";

const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toDateOnlyUTC = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export function checkDateWindow(fromRaw, toRaw, today = todayUTC()) {
  const from = toDateOnlyUTC(fromRaw);
  const to = toDateOnlyUTC(toRaw);
  if (from && today < from) {
    return { valid: false, reason: "This coupon is not active yet." };
  }
  if (to && today > to) {
    return { valid: false, reason: "This coupon has expired." };
  }
  return { valid: true, reason: "" };
}

async function hydrateCartItemsMeta(items = []) {
  if (!Array.isArray(items) || !items.length) return [];
  const pids = [
    ...new Set(
      items
        .map((it) => resolveCartItemId(it))
        .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
    ),
  ];

  let prodMap = new Map();
  if (pids.length) {
    const prods = await Product.find({ _id: { $in: pids } })
      .select("_id category sub_category category_new sub_category_new item_code")
      .lean();
    prodMap = new Map(prods.map((p) => [String(p._id), p]));
  }

  return items.map((it) => {
    const pid = resolveCartItemId(it);
    const doc = prodMap.get(pid);
    if (!doc) return it;
    return {
      ...it,
      item_code: it.item_code || doc.item_code || "",
      category: it.category || doc.category || "",
      sub_category: it.sub_category || doc.sub_category || "",
      category_new: it.category_new || doc.category_new || "",
      sub_category_new: it.sub_category_new || doc.sub_category_new || "",
    };
  });
}

function normalizeOfferRecord(offer) {
  const pct = Number(offer.percentage ?? offer.percent ?? offer.discountValue ?? 0) || 0;
  const fixed = Number(offer.fixed_price ?? offer.fixed ?? offer.amount ?? 0) || 0;
  const offerType = pct > 0 ? "percentage" : fixed > 0 ? "fixed_price" : "";

  return {
    _id: String(offer._id || ""),
    offer_code: normalizeCouponCode(offer.offer_code),
    offer_type: offerType,
    percentage: pct > 0 ? pct : 0,
    fixed_price: fixed > 0 ? fixed : 0,
    offer_product_category: offer.offer_product_category || "",
    offer_product: Array.isArray(offer.offer_product) ? offer.offer_product.map(String) : [],
    offer_category: Array.isArray(offer.offer_category) ? offer.offer_category.map(String) : [],
    minOrderAmount: Number(offer.min_order_amount ?? offer.cart_value ?? offer.minOrderAmount ?? 0) || 0,
    notes: String(offer.notes || "").trim(),
    from_date: offer.from_date || null,
    to_date: offer.to_date || null,
    status: String(offer.fest_offer_status || "active").toLowerCase(),
    source: "ecom_offer_info",
  };
}

function normalizeCouponNewRecord(doc) {
  const typeRaw = String(doc.type || "").trim().toLowerCase();
  const discountVal = Number(doc.discount || 0) || 0;
  const isPercent = typeRaw === "p" || typeRaw.includes("percent") || typeRaw === "%";

  return {
    _id: String(doc._id || ""),
    offer_code: normalizeCouponCode(doc.code),
    offer_type: isPercent ? "percentage" : "fixed_price",
    percentage: isPercent ? discountVal : 0,
    fixed_price: isPercent ? 0 : discountVal,
    offer_product_category: doc.item_code ? "product" : "",
    offer_product: [],
    offer_category: [],
    item_code: String(doc.item_code || "").trim(),
    minOrderAmount: Number(doc.cart_value || 0) || 0,
    notes: String(doc.name || "").trim(),
    from_date: doc.date_start || null,
    to_date: doc.date_end || null,
    status: Number(doc.status) === 1 ? "active" : "inactive",
    source: "coupon_new",
  };
}

/**
 * Validate a coupon code server-side against Offer & CouponNew collections + active cart items.
 */
export async function validateCouponServer({ code, items = [], userId = null }) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  const codeRegex = new RegExp(`^${escapeRegex(normalizedCode)}$`, "i");
  const hydratedItems = await hydrateCartItemsMeta(items);

  // 1. Check Offer (ecom_offer_info)
  const offer = await Offer.findOne({ offer_code: codeRegex }).lean();
  if (offer) {
    const status1 = String(offer.fest_offer_status || "").toLowerCase();
    const status2 = String(offer.fest_offer_status2 || "").toLowerCase();
    if (status1 !== "active" || (status2 && status2 !== "active")) {
      return { valid: false, error: "This coupon is currently inactive." };
    }

    const windowCheck = checkDateWindow(offer.from_date, offer.to_date);
    if (!windowCheck.valid) {
      return { valid: false, error: windowCheck.reason };
    }

    if (Array.isArray(offer.selected_users) && offer.selected_users.length > 0) {
      if (!userId) {
        return { valid: false, error: "Please sign in to apply this coupon." };
      }
      const allowed = offer.selected_users.some((id) => String(id) === String(userId));
      if (!allowed) {
        return { valid: false, error: "This coupon is not valid for your account." };
      }
    }

    if (offer.limit_enabled && Number(offer.offer_limit) > 0) {
      if (Number(offer.used_by || 0) >= Number(offer.offer_limit)) {
        return { valid: false, error: "This coupon has reached its maximum usage limit." };
      }
    }

    const normalizedCoupon = normalizeOfferRecord(offer);
    const evaluation = evaluateCouponDiscount(normalizedCoupon, hydratedItems);
    if (!evaluation.valid) {
      return { valid: false, error: evaluation.error };
    }

    return {
      valid: true,
      coupon: normalizedCoupon,
      discountAmount: evaluation.discountAmount,
      eligibleSubtotal: evaluation.eligibleSubtotal,
      message: `${normalizedCoupon.offer_code} applied! You save ₹${evaluation.discountAmount.toLocaleString("en-IN")}.`,
    };
  }

  // 2. Fallback to CouponNew (coupon_new)
  const couponDoc = await CouponNew.findOne({ code: codeRegex }).lean();
  if (!couponDoc) {
    return { valid: false, error: "Invalid coupon code. Please check and try again." };
  }

  if (Number(couponDoc.status) !== 1) {
    return { valid: false, error: "This coupon is currently inactive." };
  }

  const windowCheck = checkDateWindow(couponDoc.date_start, couponDoc.date_end);
  if (!windowCheck.valid) {
    return { valid: false, error: windowCheck.reason };
  }

  if (Number(couponDoc.uses_total) > 0) {
    const totalUsed = await OrderNew.countDocuments({
      promotion_code_applied: codeRegex,
    });
    if (totalUsed >= Number(couponDoc.uses_total)) {
      return { valid: false, error: "This coupon has reached its maximum usage limit." };
    }
  }

  if (Number(couponDoc.uses_customer) > 0 && userId) {
    const userUsed = await OrderNew.countDocuments({
      user_id: String(userId),
      promotion_code_applied: codeRegex,
    });
    if (userUsed >= Number(couponDoc.uses_customer)) {
      return {
        valid: false,
        error: "You have already redeemed this coupon the maximum number of times.",
      };
    }
  }

  const normalizedCoupon = normalizeCouponNewRecord(couponDoc);
  const evaluation = evaluateCouponDiscount(normalizedCoupon, hydratedItems);
  if (!evaluation.valid) {
    return { valid: false, error: evaluation.error };
  }

  return {
    valid: true,
    coupon: normalizedCoupon,
    discountAmount: evaluation.discountAmount,
    eligibleSubtotal: evaluation.eligibleSubtotal,
    message: `${normalizedCoupon.offer_code} applied! You save ₹${evaluation.discountAmount.toLocaleString("en-IN")}.`,
  };
}

/**
 * List currently active, date-valid public coupons across Offer and CouponNew.
 */
export async function listPublicActiveCoupons({ userId = null } = {}) {
  const today = todayUTC();
  const [offers, newCoupons] = await Promise.all([
    Offer.find({
      fest_offer_status: { $regex: /^active$/i },
      fest_offer_status2: { $regex: /^active$/i },
    }).lean(),
    CouponNew.find({
      status: 1,
      $or: [
        { is_display_frontend: 1 },
        { is_display_frontend: { $exists: false } },
        { is_display_frontend: null },
      ],
    }).lean(),
  ]);

  const seen = new Set();
  const results = [];

  for (const o of offers) {
    if (!checkDateWindow(o.from_date, o.to_date, today).valid) continue;
    if (o.limit_enabled && Number(o.offer_limit) > 0 && Number(o.used_by || 0) >= Number(o.offer_limit)) {
      continue;
    }
    if (Array.isArray(o.selected_users) && o.selected_users.length > 0) {
      if (!userId || !o.selected_users.some((id) => String(id) === String(userId))) {
        continue;
      }
    }
    const norm = normalizeOfferRecord(o);
    if (!norm.offer_code || seen.has(norm.offer_code)) continue;
    if (!(norm.percentage > 0 || norm.fixed_price > 0)) continue;
    seen.add(norm.offer_code);
    results.push({
      code: norm.offer_code,
      percentage: norm.percentage,
      fixed_price: norm.fixed_price,
      offer_type: norm.offer_type,
      minOrderAmount: norm.minOrderAmount,
      notes: norm.notes,
      from_date: norm.from_date,
      to_date: norm.to_date,
      offer_product: norm.offer_product,
      offer_category: norm.offer_category,
      offer_product_category: norm.offer_product_category,
    });
  }

  for (const c of newCoupons) {
    if (!checkDateWindow(c.date_start, c.date_end, today).valid) continue;
    const norm = normalizeCouponNewRecord(c);
    if (!norm.offer_code || seen.has(norm.offer_code)) continue;
    if (!(norm.percentage > 0 || norm.fixed_price > 0)) continue;
    seen.add(norm.offer_code);
    results.push({
      code: norm.offer_code,
      percentage: norm.percentage,
      fixed_price: norm.fixed_price,
      offer_type: norm.offer_type,
      minOrderAmount: norm.minOrderAmount,
      notes: norm.notes,
      from_date: norm.from_date,
      to_date: norm.to_date,
      offer_product: [],
      offer_category: [],
      offer_product_category: norm.offer_product_category,
      item_code: norm.item_code || "",
    });
  }

  return results;
}
