'use client';
import { useState, useEffect, useRef, useMemo } from "react";
import { TbBrandAppgallery } from "react-icons/tb";
import {
  FiBox,
  FiCheckCircle,
  FiFileText,
  FiHash,
  FiPhoneCall,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import Image from "next/image";
import { FaShoppingCart, FaStar } from "react-icons/fa";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { useHeaderdetails } from '@/context/HeaderContext';
import { toast } from 'react-toastify';
import { getDiscountInfo } from "@/lib/discountHelper";
import { parseKeyFeatureLines } from "@/utils/compareHelpers";
import { resolveProductReturnPolicy } from "@/lib/constants/returnPolicy";

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

function ReviewsTab({ productId, reviewForm, setReviewForm, handleReviewSubmit, submitting, tabData, formatReviewDate }) {
  const [qaItems, setQaItems] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaSearch, setQaSearch] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaName, setQaName] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);

  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      const userName = payload?.name || payload?.username || "";
      if (userName) setQaName((prev) => prev || userName);
    } catch {
      // Ignore invalid token
    }
  }, []);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setQaLoading(true);
    fetch(`/api/products/qa?productId=${encodeURIComponent(productId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setQaItems(Array.isArray(data.items) ? data.items : []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setQaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleQaSubmit = async (e) => {
    e.preventDefault();
    if (qaSubmitting) return;
    const trimmed = qaQuestion.trim();
    if (trimmed.length < 5) {
      toast.error("Please enter a question (at least 5 characters).");
      return;
    }

    setQaSubmitting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/products/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId,
          question: trimmed,
          userName: qaName.trim() || "Customer",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to post question.");
      } else {
        toast.success("Question posted!");
        setQaQuestion("");
        if (data.item) {
          setQaItems((prev) => [data.item, ...prev]);
        }
      }
    } catch {
      toast.error("Unable to post question right now.");
    } finally {
      setQaSubmitting(false);
    }
  };

  const reviewsList = tabData?.reviews?.items || [];
  const totalReviews = tabData?.reviews?.count ?? reviewsList.length ?? 0;
  const avgRating = Number(tabData?.reviews?.rating || 0);

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviewsList.filter((r) => Math.round(Number(r.rating)) === star).length;
    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, pct };
  });

  const filteredQa = useMemo(() => {
    const q = qaSearch.trim().toLowerCase();
    if (!q) return qaItems;
    return qaItems.filter(
      (item) =>
        String(item.question || "").toLowerCase().includes(q) ||
        String(item.answer || "").toLowerCase().includes(q)
    );
  }, [qaItems, qaSearch]);

  const onValidatedReviewSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!reviewForm.rating || Number(reviewForm.rating) < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    if (!String(reviewForm.title || "").trim() || !String(reviewForm.comment || "").trim()) {
      toast.error("Please enter both a review title and your comments.");
      return;
    }
    handleReviewSubmit(e);
  };

  return (
    <div className="space-y-8">
      {/* Top Grid: Rating Overview + Write a Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Rating Overview Card */}
        <div className="lg:col-span-5 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Customer Ratings</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl font-extrabold text-gray-900">
              {avgRating.toFixed(1)}
            </div>
            <div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < Math.floor(avgRating) ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 font-medium text-gray-700">{star}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Write a Review Form */}
        <form
          onSubmit={onValidatedReviewSubmit}
          className="lg:col-span-7 bg-white border border-gray-200 p-5 rounded-xl shadow-2xs"
        >
          <h3 className="font-bold text-gray-900 text-sm text-left mb-3">Write a Review</h3>
          <input
            type="text"
            placeholder="Review Title"
            value={reviewForm.title}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg p-2.5 mb-2.5 text-sm focus:outline-none focus:border-[#d32f2f]"
          />
          <StarRating
            value={reviewForm.rating}
            onChange={(rating) => setReviewForm((prev) => ({ ...prev, rating }))}
          />
          <textarea
            placeholder="Write your comments..."
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg p-2.5 mb-3 text-sm focus:outline-none focus:border-[#d32f2f]"
            rows="3"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#d32f2f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#b71c1c] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>

      {/* Customer Reviews List / Empty State */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Customer Reviews</h3>
        {reviewsList.length > 0 ? (
          <div className="space-y-3 max-w-4xl">
            {reviewsList.map((review, index) => (
              <div
                key={review._id || index}
                className="border border-gray-200 rounded-xl p-4 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span className="text-yellow-400 text-sm" key={i}>
                          {i < review.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-900 font-semibold text-sm">{review.title}</p>
                  </div>
                  {(review.verifiedBuyer || review.isVerified) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <FiCheckCircle className="w-3 h-3" />
                      Verified Buyer
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-left mt-2 text-sm leading-relaxed">
                  {review.comment}
                </p>
                <p className="text-gray-400 text-left text-xs mt-2">
                  Reviewed by {review.userName || "Customer"} on {formatReviewDate(review.date)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/70 text-center max-w-4xl">
            <h4 className="text-sm font-bold text-gray-800">No reviews so far</h4>
            <p className="text-xs text-gray-500 mt-1">
              No reviews so far. Share your experience with this product!
            </p>
          </div>
        )}
      </div>

      {/* Customer Questions & Answers (Q&A) */}
      <div className="pt-6 border-t border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Customer Questions &amp; Answers ({qaItems.length})
            </h3>
            <p className="text-xs text-gray-500">
              Have a question about specs, installation, or compatibility? Ask Sathya Store.
            </p>
          </div>
          {qaItems.length > 0 && (
            <input
              type="text"
              value={qaSearch}
              onChange={(e) => setQaSearch(e.target.value)}
              placeholder="Search questions & answers..."
              className="w-full sm:w-64 text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d32f2f]"
            />
          )}
        </div>

        {/* Ask a Question Box */}
        <form
          onSubmit={handleQaSubmit}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 max-w-4xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              placeholder="Have a question about this product? Ask here..."
              className="sm:col-span-7 text-xs px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#d32f2f]"
            />
            <input
              type="text"
              value={qaName}
              onChange={(e) => setQaName(e.target.value)}
              placeholder="Your Name (optional)"
              className="sm:col-span-3 text-xs px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#d32f2f]"
            />
            <button
              type="submit"
              disabled={qaSubmitting}
              className="sm:col-span-2 bg-[#d32f2f] hover:bg-[#b71c1c] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {qaSubmitting ? "Posting..." : "Post Question"}
            </button>
          </div>
        </form>

        {/* Q&A List / Empty State */}
        {qaLoading ? (
          <p className="text-xs text-gray-500">Loading questions...</p>
        ) : qaItems.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/70 text-center max-w-4xl">
            <h4 className="text-sm font-bold text-gray-800">No questions so far</h4>
            <p className="text-xs text-gray-500 mt-1">
              Be the first to ask a question about this product.
            </p>
          </div>
        ) : filteredQa.length === 0 ? (
          <p className="text-xs text-gray-500">No matching questions found.</p>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filteredQa.map((qa) => (
              <div
                key={qa._id}
                className="border border-gray-200 rounded-xl p-4 bg-white space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-extrabold text-[#d32f2f] mt-0.5">Q:</span>
                  <p className="text-sm font-semibold text-gray-900">{qa.question}</p>
                </div>
                {qa.answer ? (
                  <div className="flex items-start gap-2 pl-0.5">
                    <span className="text-xs font-extrabold text-emerald-700 mt-0.5">A:</span>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-700 leading-relaxed">{qa.answer}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Answered by {qa.answeredBy || "Sathya Store"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pl-5">
                    <span className="inline-block text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Awaiting answer from Sathya Store
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  // DB may store HTML (<ul><li>...), Word junk (<o:p>), or literal \n — never show raw tags.
  return parseKeyFeatureLines(keySpecs);
}

const POLICY_SECTION_ICONS = {
  "replacement-guarantee": FiShield,
  "eligibility-transit": FiCheckCircle,
  "refunds-cancellations": FiRefreshCw,
};

function renderPolicySegments(segments) {
  return segments.map((part, idx) => {
    if (part.href) {
      const isInternal = part.href.startsWith("/");
      const linkClass =
        "text-[#d32f2f] hover:underline font-semibold break-words";
      if (isInternal) {
        return (
          <Link key={idx} href={part.href} className={linkClass}>
            {part.text}
          </Link>
        );
      }
      return (
        <a key={idx} href={part.href} className={linkClass}>
          {part.text}
        </a>
      );
    }
    if (part.strong) {
      return (
        <strong key={idx} className="font-semibold text-gray-900">
          {part.text}
        </strong>
      );
    }
    return <span key={idx}>{part.text}</span>;
  });
}

function ReturnPolicySupportFooter({ support }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-red-50 text-[#d32f2f] flex items-center justify-center shrink-0 border border-red-100">
          <FiPhoneCall className="w-4 h-4" />
        </span>
        <div className="text-xs sm:text-sm text-gray-700 leading-relaxed min-w-0 break-words">
          <span className="font-semibold text-gray-900">Need help?</span>{" "}
          Call Sathya Customer Care at{" "}
          <a
            href={support.phoneHref}
            className="font-semibold text-[#d32f2f] hover:underline whitespace-nowrap"
          >
            {support.phoneDisplay}
          </a>{" "}
          <span className="text-gray-500">({support.supportHours})</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm shrink-0">
        <Link
          href={support.contactHref}
          className="font-semibold text-gray-700 hover:text-[#d32f2f] hover:underline"
        >
          {support.contactLabel}
        </Link>
        <span className="text-gray-300" aria-hidden="true">
          |
        </span>
        <Link
          href={support.fullPolicyHref}
          className="font-semibold text-[#d32f2f] hover:underline"
        >
          {support.fullPolicyLabel} →
        </Link>
      </div>
    </div>
  );
}

function ReturnPolicyTabContent({ product }) {
  const { isCustom, customPolicy, defaultPolicy } = resolveProductReturnPolicy(product);
  const { support } = defaultPolicy;

  if (isCustom) {
    return (
      <div className="w-full text-left max-w-4xl py-2 space-y-3.5">
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiShield className="w-4 h-4 text-[#d32f2f] shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Product Return &amp; Replacement Policy
              </h3>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#d32f2f]">
              Product-Specific Terms
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
            {customPolicy}
          </p>
        </div>

        <ReturnPolicySupportFooter support={support} />
      </div>
    );
  }

  return (
    <div className="w-full text-left max-w-4xl py-2 space-y-4">
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 sm:p-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-[#d32f2f] text-white flex items-center justify-center shrink-0 mt-0.5">
          <FiShield className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900">
            {defaultPolicy.heading}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-relaxed">
            {defaultPolicy.subheading}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {defaultPolicy.sections.map((section) => {
          const SectionIcon = POLICY_SECTION_ICONS[section.id] || FiShield;
          return (
            <div
              key={section.id}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <SectionIcon className="w-4 h-4 text-[#d32f2f] shrink-0" />
                <h4 className="text-sm font-bold text-gray-900">{section.title}</h4>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700 leading-relaxed">
                {section.points.map((segments, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#d32f2f] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {renderPolicySegments(segments)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <FiFileText className="w-4 h-4 text-[#d32f2f] shrink-0" />
            <h4 className="text-sm font-bold text-gray-900">
              {defaultPolicy.bankRefundDetails.title}
            </h4>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs sm:text-sm text-gray-700">
            {defaultPolicy.bankRefundDetails.fields.map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1.5"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="font-medium text-gray-800 break-words">{field}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ReturnPolicySupportFooter support={support} />
    </div>
  );
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
  const resolvedProductId = String(product?._id || product?.id || "").trim();
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
      let cleaned = String(html);
      cleaned = cleaned.replace(/^"+|"+$/g, "");
      cleaned = cleaned.replace(/^<p>"/, "").replace(/"<\/p>$/, "");
      cleaned = cleaned.replace(/\\"/g, '"');
      cleaned = cleaned.replace(/\\\//g, "/");
      cleaned = cleaned.replace(/\\u200e/g, "");
      // CMS/import often stores literal "\n" / "\r" / "\t" as text — do not show them
      cleaned = cleaned
        .replace(/\\r\\n/gi, " ")
        .replace(/\\n/gi, " ")
        .replace(/\\r/gi, " ")
        .replace(/\\t/gi, " ")
        .replace(/\r\n/g, " ")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/ {2,}/g, " ")
        .trim();
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
  const returnPolicyContent = useMemo(
    () => <ReturnPolicyTabContent product={product} />,
    [product]
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
        label: `REVIEWS (${tabData.reviews.count ?? reviewCount ?? 0}) & Q&A`,
        content: (
          <ReviewsTab
            productId={resolvedProductId}
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
      resolvedProductId,
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