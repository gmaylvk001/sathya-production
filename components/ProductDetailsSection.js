'use client';
import { useState, useEffect, useRef, useMemo } from "react";
import { TbBrandAppgallery } from "react-icons/tb";
import { FiBox, FiHash } from "react-icons/fi";
import Image from "next/image";
import { FaShoppingCart, FaStar } from "react-icons/fa";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { useHeaderdetails } from '@/context/HeaderContext';
import { toast } from 'react-toastify';
import { getDiscountInfo } from "@/lib/discountHelper";

function StarRating({ value, onChange }) {
  return (
    <div className="flex space-x-1 mb-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <span
            className={`text-2xl ${
              star <= value ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

function DynamicTabs({ tabs, activeName, onTabChange, reviewsRef }) {
  return (
    <div className="w-full">
      {/* Tab Bar Header */}
      <div className="border-b-2 border-[#d32f2f] w-full">
        <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const isActive = activeName === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => onTabChange && onTabChange(tab.name)}
                className={`px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap flex-shrink-0 rounded-t ${
                  isActive
                    ? "bg-[#d32f2f] text-white"
                    : "bg-transparent text-gray-800 hover:text-[#d32f2f]"
                }`}
              >
                {tab.label || tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep all tabs mounted; only active one is visible to preserve Flix DOM */}
      {tabs.map((tab) => (
        <div
          key={tab.name}
          ref={tab.name === "reviews" ? reviewsRef : null}
          style={{ display: activeName === tab.name ? "block" : "none" }}
          className="w-full py-5 px-1 sm:px-2 text-left bg-white"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({ reviewForm, setReviewForm, handleReviewSubmit, submitting, tabData, formatReviewDate }) {
  return (
    <div>
      <form onSubmit={handleReviewSubmit} className="bg-white p-4 rounded-md shadow mt-3 max-w-2xl">
        <h3 className="font-semibold text-left mb-2">Write a Review</h3>
        <input
          type="text"
          placeholder="Review Title"
          value={reviewForm.title}
          onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
          required
          className="w-full border rounded p-2 mb-2 text-sm"
        />
        <StarRating value={reviewForm.rating} onChange={(rating) => setReviewForm(prev => ({ ...prev, rating }))} />
        <textarea
          placeholder="Write your comments..."
          value={reviewForm.comment}
          onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
          className="w-full border rounded p-2 mb-2 text-sm"
          rows="3"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#d32f2f] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-[#b71c1c] transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>

      <h2 className="text-sm font-bold text-left mt-6">Customer Reviews</h2>
      <div className="flex items-center mt-2">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`text-2xl ${i < Math.floor(tabData.reviews.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
        ))}
        <span className="text-gray-700 ml-2 text-sm">
          {tabData.reviews.rating.toFixed(1)} ({tabData.reviews.count} Reviews)
        </span>
      </div>

      {tabData.reviews.items.length > 0 ? (
        <div className="mt-4 space-y-3 max-w-3xl">
          {tabData.reviews.items.map((review, index) => (
            <div key={index} className={`border-b border-gray-200 pb-3 ${index === 0 ? "border-t pt-3" : ""}`}>
              <div className="flex text-lg items-baseline mt-1">
                {[...Array(5)].map((_, i) => (
                  <span className="text-yellow-400 text-sm" key={i}>{i < review.rating ? '★' : '☆'}</span>
                ))}
                <p className="text-gray-800 font-semibold text-sm ml-2">{review.title}</p>
              </div>
              <p className="text-gray-700 text-left mt-1.5 text-sm">{review.comment}</p>
              <p className="text-gray-400 text-left text-xs mt-1">
                Reviewed By {review.userName} on {formatReviewDate(review.date)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-4 text-sm">No reviews yet. Be the first to review this product!</p>
      )}
    </div>
  );
}

function parseProductHighlights(highlights) {
  if (!Array.isArray(highlights)) return [];
  return highlights
    .flatMap((item) => String(item).split(/[\n,]+/).map((x) => x.trim()))
    .filter((item) => item.length > 0);
}

function parseKeyFeatures(keySpecs) {
  if (!Array.isArray(keySpecs)) return [];
  return keySpecs
    .flatMap((item) => String(item).split(/,(?![^(]*\))/))
    .map((f) => String(f).replace(/[{}\[\]"]/g, "").trim())
    .filter((f) => f.length > 0);
}

export default function ProductDetailsSection({
  product,
  reviews = [],
  avgRating = 0,
  reviewCount = 0,
  manufacturerName = "",
  manufacturerAddress = "",
  flixInstanceActive = true,
  flixInpageAvailable = null,
}) {
  const [brand, setBrand] = useState([]);
  const [activeTab, setActiveTab] = useState("manufacturer");
  const { updateHeaderdetails, setIsLoggedIn, setUserData, setIsAdmin } = useHeaderdetails();
  const [brandName, setBrandName] = useState("");
  const reviewsRef = useRef(null);

  const productHighlights = useMemo(
    () => parseProductHighlights(product?.product_highlights),
    [product?.product_highlights]
  );
  const keyFeatures = useMemo(
    () => parseKeyFeatures(product?.key_specifications),
    [product?.key_specifications]
  );

  const tabData = {
    overview: product?.overview || "No overview available.",
    description: product?.description || "No description available.",
    reviews: {
      rating: avgRating,
      count: reviewCount,
      items: reviews.map((r) => ({
        title: r.reviews_title,
        rating: r.reviews_rating,
        comment: r.reviews_comments,
        userName: r.user_id?.name || "Anonymous",
        date: r.created_date,
      })),
    },
  };

  // Keep deep-link (#reviews) override and default active tab per product
  useEffect(() => {
    if (!product) return;
    if (typeof window !== "undefined" && window.location.hash === "#reviews") {
      setActiveTab("reviews");
      setTimeout(() => {
        const headerEl = document.querySelector("header");
        const headerHeight = headerEl ? headerEl.offsetHeight : 0;
        if (reviewsRef.current) {
          const y = reviewsRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 300);
    } else {
      setActiveTab("manufacturer");
    }
  }, [product?._id]);

  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error || !Array.isArray(result?.data)) {
        if (result.error) console.warn("Brand fetch:", result.error);
      } else {
        const data = result.data;
        const brandOptions = data.map((b) => ({
          value: b._id,
          label: b.brand_name,
        }));
        setBrand(brandOptions);
        if (product?.brand) {
          const matched = brandOptions.find((b) => b.value === product.brand);
          if (matched && matched.label) {
            setBrandName((prev) => (prev ? prev : matched.label));
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch brand:", error?.message);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, []);

  // Derive brandName
  useEffect(() => {
    if (!product) return;
    let derived = "";
    if (product.brand && typeof product.brand === "object" && product.brand.brand_name) {
      derived = product.brand.brand_name;
    } else if (product.brand) {
      const matched = Array.isArray(brand) ? brand.find((b) => b.value === product.brand) : null;
      if (matched?.label) derived = matched.label;
    } else if (product.brand_name) {
      derived = product.brand_name;
    } else if (product.manufacturer) {
      derived = product.manufacturer;
    }
    if (derived && derived !== brandName) {
      setBrandName(derived);
    }
  }, [product, brand]);

  const parseJSONSafe = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;

    const tryParse = (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return undefined;
      }
    };

    let s = value.trim();
    let parsed = tryParse(s);
    if (parsed !== undefined) {
      return typeof parsed === "string" ? parseJSONSafe(parsed) : parsed;
    }

    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
      parsed = tryParse(s);
      if (parsed !== undefined) return typeof parsed === "string" ? parseJSONSafe(parsed) : parsed;
    }

    try {
      const unescaped = s.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      parsed = tryParse(unescaped);
      if (parsed !== undefined) return typeof parsed === "string" ? parseJSONSafe(parsed) : parsed;
    } catch {}

    return null;
  };

  function formatReviewDate(date) {
    if (!date) return "";
    const reviewDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor((now - reviewDate) / (1000 * 60 * 60 * 24));
    if (diffInDays < 7) {
      return formatDistanceToNow(reviewDate, { addSuffix: true });
    } else {
      return format(reviewDate, "MMM d, yyyy");
    }
  }

  const [reviewForm, setReviewForm] = useState({
    title: "",
    rating: 0,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const reslt = await fetch('/api/auth/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data1 = await reslt.json();
      if (!data1.loggedIn) {
        toast.error("Please login to continue!..");
        return;
      }
      if (data1.loggedIn) {
        const userId = data1.user?.userId || data1.user?._id;
        const productId = product._id;
        const res = await fetch(`/api/reviews/${product._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            userId,
            productId,
            reviews_title: reviewForm.title,
            reviews_rating: reviewForm.rating,
            reviews_comments: reviewForm.comment,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Review added successfully!");
          setReviewForm({ title: "", rating: 0, comment: "" });
        } else {
          toast.error(data.error || "Failed to submit review");
        }
      }
    } catch (error) {
      toast.error("Error submitting review: " + (error?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  // TAB 1: FROM THE MANUFACTURER
  const showFlixInManufacturer = flixInstanceActive && flixInpageAvailable === true;
  const isEmptyManufacturerValue = (value) => {
    if (value == null) return true;
    const text = String(value).trim();
    if (!text) return true;
    const lower = text.toLowerCase();
    return lower === "null" || lower === "undefined" || lower === "n/a" || lower === "-";
  };

  const customManufacturerRichContent = (() => {
    if (product?.manufacturer_content && typeof product.manufacturer_content === "string" && product.manufacturer_content.trim()) {
      return product.manufacturer_content;
    }
    if (product?.a_plus_content && typeof product.a_plus_content === "string" && product.a_plus_content.trim()) {
      return product.a_plus_content;
    }
    return null;
  })();

  const hasBrandManufacturerInfo = Boolean(
    (manufacturerName && !isEmptyManufacturerValue(manufacturerName)) ||
    (manufacturerAddress && !isEmptyManufacturerValue(manufacturerAddress)) ||
    (brandName && !isEmptyManufacturerValue(brandName))
  );

  const brandManufacturerCard = hasBrandManufacturerInfo ? (
    <div className={showFlixInManufacturer || customManufacturerRichContent ? "mt-6 pt-2" : "pt-2"}>
      <h2 className="text-sm font-bold text-left mb-3">Manufacturer Information</h2>
      <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 sm:p-5 max-w-3xl space-y-3">
        {manufacturerName && !isEmptyManufacturerValue(manufacturerName) && (
          <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
            <span className="font-semibold text-gray-800">Manufacturer:</span>
            <span className="text-gray-700 font-medium">{manufacturerName}</span>
          </div>
        )}
        {manufacturerAddress && !isEmptyManufacturerValue(manufacturerAddress) && (
          <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
            <span className="font-semibold text-gray-800">Registered Office Address:</span>
            <span className="text-gray-700">{manufacturerAddress}</span>
          </div>
        )}
        {brandName && !isEmptyManufacturerValue(brandName) && (
          <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
            <span className="font-semibold text-gray-800">Brand:</span>
            <span className="text-gray-700">{brandName}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const manufacturerContent = (
    <div className="w-full text-left" id="manufacturer-tab">
      {/* FlixMedia container - stays mounted in DOM so Flix loader can inject without reload */}
      {flixInstanceActive ? (
        <div
          className="col-md-12 w-full"
          style={{
            display: showFlixInManufacturer ? "block" : "none",
            width: "100%",
          }}
        >
          <div id="flix-inpage" className="w-full" style={{ width: "100%" }} />
        </div>
      ) : null}

      {/* Custom A+ content if present */}
      {customManufacturerRichContent ? (
        <div
          className="prose max-w-none text-left"
          dangerouslySetInnerHTML={{ __html: customManufacturerRichContent }}
        />
      ) : null}

      {/* Brand manufacturer details (from ecom_brand_info) */}
      {!showFlixInManufacturer ? brandManufacturerCard : null}

      {/* Fallback when no Flix, A+, or brand manufacturer fields */}
      {!showFlixInManufacturer && !customManufacturerRichContent && !hasBrandManufacturerInfo && (
        <p className="text-sm text-gray-700 leading-relaxed py-2">
          There is no manufacturer content to show for this product. Explore the Details &amp; Specs section to learn more.
        </p>
      )}
    </div>
  );

  // TAB 2: OVERVIEW
  const overviewContent = (
    <div className="w-full text-left max-w-4xl" id="overview-tab">
      {product?.overviewdescription && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-2">{product.name} Overview</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{product.overviewdescription}</p>
        </div>
      )}

      {product?.overview && !product?.overviewdescription && product.overview !== "No overview available." && (
        <div className="mb-4">
          <div
            className="text-sm text-gray-700 leading-relaxed prose max-w-none"
            dangerouslySetInnerHTML={{ __html: product.overview }}
          />
        </div>
      )}

      {keyFeatures.length > 0 && (
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Key Features</h3>
          <ul className="space-y-2">
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span>{feature.charAt(0).toUpperCase() + feature.slice(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {productHighlights.length > 0 && keyFeatures.length === 0 && (
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Highlights</h3>
          <ul className="space-y-2">
            {productHighlights.map((hl, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span>{hl}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!product?.overviewdescription &&
        (!product?.overview || product.overview === "No overview available.") &&
        keyFeatures.length === 0 &&
        productHighlights.length === 0 && (
          <p className="text-gray-500 text-sm py-4">There is no product overview available for this item.</p>
        )}
    </div>
  );

  // TAB 3: DETAILS & SPECS
  const detailsAndSpecsContent = (() => {
    const isNullContent = (value) => {
      if (!value) return true;
      const strValue = String(value).trim().toLowerCase();
      const nullPatterns = [
        "", "null", "undefined", "n/a", "none", "-", 
        "null null", "undefined undefined", "nan",
        "<p>null</p>", "<p>undefined</p>", "<p>n/a</p>",
        "&lt;p&gt;null&lt;/p&gt;", "&lt;p&gt;undefined&lt;/p&gt;"
      ];
      return nullPatterns.includes(strValue) || 
             strValue.replace(/<[^>]*>/g, '').trim() === 'null' ||
             strValue === '<p></p>' ||
             strValue === '<p> </p>';
    };

    const descObj = parseJSONSafe(product?.description);
    const hasValidDescription = descObj && typeof descObj === "object" && Object.keys(descObj).length > 0;
    const hasPlainDescription = product?.description && !isNullContent(product.description) && !descObj;

    const specifications = [
      {
        icon: <TbBrandAppgallery size={14} className="text-white" />,
        label: "Brand",
        value: brandName || (Array.isArray(brand) ? brand.find((b) => b.value === product?.brand)?.label : ""),
      },
      {
        icon: <FiHash size={16} className="text-white" />,
        label: "Item Code", 
        value: product?.item_code,
      },
      {
        icon: <FiBox size={14} className="text-white" />,
        label: "Ingredients",
        value: product?.ingredients,
      },
      {
        icon: <FiBox size={14} className="text-white" />,
        label: "Weight",
        value: product?.weight,
      },
      {
        icon: <FiBox size={14} className="text-white" />,
        label: "Dimensions",
        value: product?.dimensions, 
      }
    ].filter(item => item.value && !isNullContent(item.value));

    const hasSpecifications = specifications.length > 0;

    const decodeAndCleanHtml = (html) => {
      if (!html) return "";
      let cleaned = html;
      cleaned = cleaned.replace(/^"+|"+$/g, "");
      cleaned = cleaned.replace(/^<p>"/, "").replace(/"<\/p>$/, "");
      cleaned = cleaned.replace(/\\"/g, '"');
      cleaned = cleaned.replace(/\\\//g, "/");
      cleaned = cleaned.replace(/\\u200e/g, "");
      if (typeof document !== "undefined") {
        try {
          const txt = document.createElement("textarea");
          txt.innerHTML = cleaned;
          cleaned = txt.value;
        } catch {}
      }
      return cleaned;
    };

    const hasManufacturerInfo = Boolean(
      (manufacturerName && !isNullContent(manufacturerName)) ||
      (manufacturerAddress && !isNullContent(manufacturerAddress)) ||
      (product?.importer && !isNullContent(product.importer)) ||
      (brandName && !isNullContent(brandName))
    );

    const hasAnyContent = hasValidDescription || hasPlainDescription || hasSpecifications || hasManufacturerInfo;

    if (!hasAnyContent) {
      return (
        <p className="text-sm text-gray-500 py-4">No specifications available for this product.</p>
      );
    }

    return (
      <div className="w-full text-left space-y-6">
        {/* Product Specifications / Description */}
        {(hasValidDescription || hasPlainDescription) && (
          <div>
            <h2 className="text-sm font-bold text-left mb-3">Product Specifications</h2>
            {hasValidDescription ? (
              <div className="mt-3 text-xs sm:text-sm text-gray-700 space-y-1">
                {Object.entries(descObj)
                  .filter(([key, val]) => key && val && !isNullContent(key) && !isNullContent(val))
                  .map(([key, val]) => {
                    const cleanKey = decodeAndCleanHtml(key);
                    const cleanVal = decodeAndCleanHtml(val);
                    return (
                      <div key={cleanKey} className="grid grid-cols-[150px,1fr] sm:grid-cols-[200px,1fr] gap-x-2 py-1.5 border-b border-gray-100 items-start">
                        <div className="text-xs sm:text-sm font-semibold text-gray-800">{cleanKey}:</div>
                        <div className="text-xs sm:text-sm text-gray-600">{cleanVal}</div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              (() => {
                const cleanedDescription = decodeAndCleanHtml(String(product?.description || ""));
                const hasTableHtml = cleanedDescription.includes("<table") || cleanedDescription.includes("&lt;table");
                return (
                  <div
                    className={
                      hasTableHtml
                        ? "mt-3 text-xs sm:text-sm text-gray-700 prose prose-gray max-w-none text-left overflow-x-auto [&_table]:w-full [&_table]:border [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:p-2 [&_td]:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_tr:nth-child(even)]:bg-gray-50"
                        : "mt-3 text-xs sm:text-sm text-gray-700 prose prose-gray max-w-none text-left"
                    }
                    dangerouslySetInnerHTML={{ __html: cleanedDescription }}
                  />
                );
              })()
            )}
          </div>
        )}

        {/* General Attributes */}
        {hasSpecifications && (
          <div>
            <h2 className="text-sm font-bold text-left mb-3">General Attributes</h2>
            <ul className="mt-1 sm:mt-2 text-gray-700 text-xs sm:text-sm space-y-2">
              {specifications.map((item, idx) => (
                <li key={idx} className="flex items-center">
                  <div className="w-5 h-5 flex items-center justify-center bg-gray-600 rounded-md mr-2 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex gap-x-2">
                    <strong className="text-xs sm:text-sm font-semibold text-gray-800">{item.label}:</strong>
                    <span className="text-gray-600">{item.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manufacturer & Importer Details - moved from Manufacturer tab to DETAILS & SPECS */}
        {hasManufacturerInfo && (
          <div className="pt-2">
            <h2 className="text-sm font-bold text-left mb-3">Manufacturer Details</h2>
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 sm:p-5 max-w-3xl space-y-3">
              {manufacturerName && !isNullContent(manufacturerName) && (
                <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
                  <span className="font-semibold text-gray-800">Manufacturer:</span>
                  <span className="text-gray-700 font-medium">{manufacturerName}</span>
                </div>
              )}
              {manufacturerAddress && !isNullContent(manufacturerAddress) && (
                <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
                  <span className="font-semibold text-gray-800">Registered Office Address:</span>
                  <span className="text-gray-700">{manufacturerAddress}</span>
                </div>
              )}
              {(product?.importer || product?.importer_name || product?.imported_by) && (
                <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
                  <span className="font-semibold text-gray-800">Importer:</span>
                  <span className="text-gray-700">{product?.importer || product?.importer_name || product?.imported_by}</span>
                </div>
              )}
              {brandName && !isNullContent(brandName) && (
                <div className="grid grid-cols-[140px,1fr] sm:grid-cols-[200px,1fr] gap-2 items-start text-xs sm:text-sm">
                  <span className="font-semibold text-gray-800">Brand:</span>
                  <span className="text-gray-700">{brandName}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  })();

  // TAB 4: WHAT'S INCLUDED
  const whatsIncludedItems = useMemo(() => {
    const isNullOrEmpty = (val) => {
      if (!val) return true;
      const s = String(val).trim().toLowerCase();
      return (
        s === "" ||
        s === "null" ||
        s === "undefined" ||
        s === "n/a" ||
        s === "none" ||
        s === "-" ||
        s === "<p>null</p>" ||
        s === "<p></p>"
      );
    };

    const cleanItem = (item) => {
      if (!item) return "";
      return String(item)
        .replace(/<[^>]*>/g, "")
        .replace(/^[•\-\*\s]+/, "")
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, "&")
        .trim();
    };

    const extractItems = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap((v) => extractItems(v)).filter(Boolean);
      }
      if (typeof val === "object") {
        return Object.values(val).flatMap((v) => extractItems(v)).filter(Boolean);
      }
      if (typeof val === "string") {
        const str = val.trim();
        if (isNullOrEmpty(str)) return [];

        if (/<li[^>]*>/i.test(str)) {
          const matches = str.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          if (matches && matches.length > 0) {
            return matches.map(cleanItem).filter(Boolean);
          }
        }

        if (str.includes("\n")) {
          return str.split(/[\r\n]+/).map(cleanItem).filter(Boolean);
        }

        if (str.includes(",")) {
          return str.split(",").map(cleanItem).filter(Boolean);
        }

        if (str.includes(";")) {
          return str.split(";").map(cleanItem).filter(Boolean);
        }

        const cleaned = cleanItem(str);
        return cleaned ? [cleaned] : [];
      }
      return [];
    };

    // 1. Direct fields
    const directCandidates = [
      product?.whatsIncluded,
      product?.whats_included,
      product?.inTheBox,
      product?.in_the_box,
      product?.package_contents,
      product?.packageContents,
      product?.package_content,
      product?.sales_package,
    ];

    for (const cand of directCandidates) {
      if (cand && !isNullOrEmpty(cand)) {
        const res = extractItems(cand);
        if (res.length > 0) return res;
      }
    }

    // 2. Check JSON description
    const descObj = parseJSONSafe(product?.description);
    if (descObj && typeof descObj === "object") {
      for (const [key, val] of Object.entries(descObj)) {
        if (/in\s*the\s*box|what'?s\s*included|package\s*contents?|sales\s*package/i.test(key)) {
          if (val && !isNullOrEmpty(val)) {
            const res = extractItems(val);
            if (res.length > 0) return res;
          }
        }
      }
    }

    // 3. Check raw description string for "In The Box" or "Sales Package"
    if (typeof product?.description === "string" && !descObj) {
      const raw = product.description;
      const match = raw.match(/in\s*the\s*box[:\s]*([^<]+?)(?:Brand|Model|General|Specifications|Features|$)/i);
      if (match && match[1]) {
        const res = extractItems(match[1]);
        if (res.length > 0) return res;
      }
    }

    // 4. Check key_specifications or product_highlights
    if (Array.isArray(product?.key_specifications)) {
      for (const spec of product.key_specifications) {
        if (/in\s*the\s*box|package\s*contents?|what'?s\s*included/i.test(spec)) {
          const res = extractItems(spec.replace(/^[^:]+:\s*/, ""));
          if (res.length > 0) return res;
        }
      }
    }

    // 5. Default fallback
    const fallbackName = product?.name || "Product";
    return [
      `1 Unit ${fallbackName}`,
      "User Manual",
      "Warranty Card",
    ];
  }, [product]);

  const whatsIncludedContent = (
    <div className="w-full text-left max-w-3xl py-2">
      <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
        {whatsIncludedItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  // TAB 5: RETURN POLICY
  const returnPolicyContent = (
    <div className="w-full text-left max-w-3xl py-2">
      <p className="text-sm text-gray-700 leading-relaxed">
        See our{" "}
        <Link href="/cancellation-policy" className="text-blue-600 hover:underline font-medium">
          Return Policy
        </Link>{" "}
        to find specific return information for this product and steps on how to return in-store or by mail.
      </p>
    </div>
  );

  // BUILD TABS IN EXACT SPECIFIED 6 ORDER WITH UPPERCASE LABELS
  const tabsForUI = useMemo(
    () => [
      {
        name: "manufacturer",
        label: "FROM THE MANUFACTURER",
        content: manufacturerContent,
      },
      {
        name: "overview",
        label: "OVERVIEW",
        content: overviewContent,
      },
      {
        name: "details-specs",
        label: "DETAILS & SPECS",
        content: detailsAndSpecsContent,
      },
      {
        name: "whats-included",
        label: "WHAT'S INCLUDED",
        content: whatsIncludedContent,
      },
      {
        name: "return-policy",
        label: "RETURN POLICY",
        content: returnPolicyContent,
      },
      {
        name: "reviews",
        label: `REVIEWS(${tabData.reviews.count ?? reviewCount ?? 0})`,
        content: (
          <ReviewsTab
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            handleReviewSubmit={handleReviewSubmit}
            submitting={submitting}
            tabData={tabData}
            formatReviewDate={formatReviewDate}
          />
        ),
      },
    ],
    [
      reviewForm,
      submitting,
      tabData,
      manufacturerContent,
      overviewContent,
      detailsAndSpecsContent,
      whatsIncludedContent,
      returnPolicyContent,
      reviewCount,
    ]
  );

  return (
    <div className="mt-2 w-full">
      <div className="bg-white py-2 px-1 sm:px-2 max-w-7xl mx-auto">
        <DynamicTabs
          tabs={tabsForUI}
          activeName={activeTab}
          onTabChange={setActiveTab}
          reviewsRef={reviewsRef}
        />
      </div>
    </div>
  );
}