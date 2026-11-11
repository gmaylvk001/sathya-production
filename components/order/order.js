"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronRight, FiClock, FiCheckCircle, FiTruck, FiShoppingBag, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { RiAccountCircleFill } from "react-icons/ri";
import { ToastContainer, toast } from 'react-toastify';
import { FaAddressBook, FaStar } from "react-icons/fa";
import { HiShoppingBag } from "react-icons/hi2";
import { FaHeart } from "react-icons/fa6";
import { AuthModal } from '@/components/AuthModal';

const ORDER_TOAST_ID = "orders-toast";
const orderToast = {
  containerId: ORDER_TOAST_ID,
  autoClose: false,
  closeOnClick: false,
};

const getImageUrl = (img) => {
  if (!img) return null;
  const str = String(img).trim();
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:')) return str;
  if (str.startsWith('/uploads/products/')) return str;
  if (str.startsWith('/')) return str;
  return `/uploads/products/${str}`;
};

/** Same warranty / variant helpers as cart page */
const getWarrantyPrice = (item) => {
  if (!item) return 0;
  if (item.extendedWarranty != null && Number(item.extendedWarranty) > 0) {
    return Number(item.extendedWarranty);
  }
  if (item.warrantyData?.price != null && Number(item.warrantyData.price) > 0) {
    return Number(item.warrantyData.price);
  }
  if (item.warrantyData?.amount != null && Number(item.warrantyData.amount) > 0) {
    return Number(item.warrantyData.amount);
  }
  if (typeof item.warranty === "number" && item.warranty > 10) {
    return item.warranty;
  }
  return 0;
};

const getItemWarranty = (item) => {
  if (!item) return null;
  const wd = item.warrantyData;
  const price = getWarrantyPrice(item);
  const year = Number(
    wd?.year ||
      wd?.duration ||
      item.selectedWarranty ||
      (typeof item.warranty === "number" && item.warranty <= 5 ? item.warranty : 0) ||
      0
  );
  if (price <= 0 && year <= 0) return null;
  const rawTitle = wd?.title || wd?.name;
  const hasValidName =
    rawTitle &&
    typeof rawTitle === "string" &&
    rawTitle.trim() !== "" &&
    rawTitle.toLowerCase() !== "null" &&
    rawTitle.toLowerCase() !== "undefined";
  const title =
    (hasValidName ? rawTitle : "") ||
    (year > 0 ? `${year} Year Extended Warranty` : "Extended Warranty Protection");
  return { title, price, year };
};

const getItemVariations = (item) => {
  if (!item) return [];
  const entries = [];
  const seenKeys = new Set();
  const addEntry = (rawKey, rawVal) => {
    if (!rawKey || rawVal == null) return;
    const key = String(rawKey).trim();
    if (seenKeys.has(key.toLowerCase())) return;
    let val = "";
    if (typeof rawVal === "object") {
      val = rawVal.label || rawVal.value || rawVal.name || "";
    } else {
      val = String(rawVal).trim();
    }
    if (!val || val.toLowerCase() === "undefined" || val.toLowerCase() === "null") return;
    seenKeys.add(key.toLowerCase());
    entries.push({ key, value: val });
  };
  if (item.variantValues && typeof item.variantValues === "object") {
    for (const [k, v] of Object.entries(item.variantValues)) addEntry(k, v);
  }
  if (item.selectedVariant && typeof item.selectedVariant === "object") {
    for (const [k, v] of Object.entries(item.selectedVariant)) addEntry(k, v);
  }
  if (item.color) addEntry("Color", item.color);
  if (Array.isArray(item.attributes)) {
    item.attributes.forEach((attr) => {
      if (attr && (attr.name || attr.key) && (attr.value || attr.val)) {
        addEntry(attr.name || attr.key, attr.value || attr.val);
      }
    });
  }
  return entries;
};

export default function Order() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState([]);
  const [orderCounts, setOrderCounts] = useState({ total: 0, exist: 0, newOrders: 0 });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelComments, setCancelComments] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const itemsPerPage = 5;
  const router = useRouter();

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [sessionReviewedIds, setSessionReviewedIds] = useState(() => new Set());

  const getItemProductId = (item) => {
    if (!item) return "";
    return String(item.product_id || item.productId || item._id || "");
  };

  const isItemReviewed = (item) => {
    if (!item) return false;
    const prodId = getItemProductId(item);
    if (prodId && (item.is_reviewed || sessionReviewedIds.has(prodId))) {
      return true;
    }
    return Boolean(item.is_reviewed);
  };

  const isOrderFullyReviewed = (order) => {
    const items = order?.order_item || [];
    if (!items.length) return false;
    return items.every((item) => isItemReviewed(item));
  };

  const handleOpenReviewModal = (order) => {
    const items = order?.order_item || [];
    setSelectedReviewOrder(order);
    const unreviewed = items.find((item) => !isItemReviewed(item)) || items[0] || null;
    setSelectedReviewItem(unreviewed);
    setReviewRating(0);
    setHoverRating(0);
    setReviewTitle("");
    setReviewComments("");
    setReviewSubmitting(false);
    setReviewFeedback(null);
    setShowReviewModal(true);
  };

  const handleCloseReviewModal = () => {
    if (reviewSubmitting) return;
    setShowReviewModal(false);
    setSelectedReviewOrder(null);
    setSelectedReviewItem(null);
    setReviewRating(0);
    setHoverRating(0);
    setReviewTitle("");
    setReviewComments("");
    setReviewFeedback(null);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReviewItem) {
      toast.error("Please select a product to review.");
      return;
    }
    const productId = getItemProductId(selectedReviewItem);
    if (!productId) {
      const err = "Product ID not found. Unable to review.";
      setReviewFeedback({ type: "error", message: err });
      toast.error(err);
      return;
    }

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      const err = "Please select a star rating (1 to 5 stars).";
      setReviewFeedback({ type: "error", message: err });
      toast.error(err);
      return;
    }

    if (!reviewTitle.trim()) {
      const err = "Please enter a review title.";
      setReviewFeedback({ type: "error", message: err });
      toast.error(err);
      return;
    }

    if (!reviewComments.trim()) {
      const err = "Please enter your review feedback.";
      setReviewFeedback({ type: "error", message: err });
      toast.error(err);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setReviewSubmitting(true);
    setReviewFeedback(null);

    try {
      const response = await fetch(`/api/reviews/${productId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviews_title: reviewTitle.trim(),
          reviews_rating: Number(reviewRating),
          reviews_comments: reviewComments.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Review submitted successfully! Thank you for your feedback.");
        setSessionReviewedIds((prev) => {
          const updated = new Set(prev);
          updated.add(productId);
          return updated;
        });
        setReviewFeedback({
          type: "success",
          message: "Review submitted successfully!",
        });

        // If order only has 1 item, close after short delay
        if ((selectedReviewOrder?.order_item?.length || 0) <= 1) {
          setTimeout(() => {
            handleCloseReviewModal();
          }, 1200);
        }
      } else if (response.status === 409 || data.error?.includes("already reviewed")) {
        toast.info(data.error || "You have already reviewed this product.");
        setSessionReviewedIds((prev) => {
          const updated = new Set(prev);
          updated.add(productId);
          return updated;
        });
        setReviewFeedback({
          type: "error",
          message: data.error || "You have already reviewed this product.",
        });
      } else {
        const errMsg = data.error || data.message || "Failed to submit review.";
        setReviewFeedback({ type: "error", message: errMsg });
        toast.error(errMsg);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      const errMsg = err.message || "An error occurred while submitting your review.";
      setReviewFeedback({ type: "error", message: errMsg });
      toast.error(errMsg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/orders/get`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders data');
      }
      const data = await response.json();
      const visible = data?.orders || [];
      const existOrders = visible.filter((order) => {
        const existId = order.exist_id;
        return existId !== undefined && existId !== null && String(existId).trim() !== "" && String(existId).toLowerCase() !== "null";
      });
      setOrderCounts({
        total: visible.length,
        exist: existOrders.length,
        newOrders: visible.length - existOrders.length,
      });
      setAllOrders(visible);
      setCurrentPage(1);
    } catch (error) {
      toast.error("Failed to load orders data", orderToast);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadOrders();
  }, []);

  // Tabs filter the already-loaded orders locally
  const filteredOrders = useMemo(
    () =>
      activeFilter === "cancelled"
        ? allOrders.filter((order) => String(order.order_status || "").toLowerCase() === "cancelled")
        : allOrders,
    [allOrders, activeFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const handleFetchExistOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setFetchingOrders(true);
    try {
      const response = await fetch("/api/orders/fetch-exist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to fetch orders");
      }
      toast.success(data.message || "Orders fetched successfully", orderToast);
      setLoading(true);
      await loadOrders();
    } catch (error) {
      toast.error(error.message || "Failed to fetch orders", orderToast);
      console.error(error);
    } finally {
      setFetchingOrders(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentStatusLabel = (order) => {
    const raw = String(order.payment_status || "").trim();
    if (!raw) return "Not specified";
    const key = raw.toLowerCase();
    if (["paid", "captured", "success", "successful", "completed"].includes(key)) return "Paid";
    if (["pending", "created", "authorized", "payment_initialized", "unpaid"].includes(key)) return "Pending";
    if (["failed", "failure"].includes(key)) return "Failed";
    if (["cancelled", "canceled"].includes(key)) return "Cancelled";
    return raw;
  };

  const getPaymentMethodLabel = (order) => {
    const raw = String(
      order.payment_method || order.payment_type || order.payment_mode || ""
    ).trim();
    if (!raw) return "";
    const key = raw.toLowerCase();
    if (key === "cod" || key.includes("cash on delivery") || key.includes("cash on deliver")) {
      return "Cash on Delivery";
    }
    if (key === "online") return "Online";
    if (key === "emi") return "EMI";
    if (key.includes("pay at store") || key === "pay_at_store") return "Pay at Store";
    return raw;
  };

  const getPaymentStatusClass = (label) => {
    const key = String(label || "").toLowerCase();
    if (key === "paid") return "bg-green-100 text-green-800";
    if (key === "pending") return "bg-amber-100 text-amber-800";
    if (key === "failed" || key === "cancelled") return "bg-rose-100 text-rose-800";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusKey = (status) => String(status || "").toLowerCase();

  // Spec: show Request Cancel only for online, non-warranty, Pending/Processing orders with no prior cancel request
  const canCancelOrder = (order) => {
    // 1. Already has a cancel request → hide
    if (order?.cancel_exists) return false;

    // 2. Must be an online order (order_details_new.type defaults to "online")
    const orderType = String(order?.type || "online").trim().toLowerCase();
    if (orderType !== "online") return false;

    // 3. Must NOT be a warranty item
    const hasWarrantyItem = (order?.order_item || []).some(
      (item) => Number(item.is_warranty) === 1
    );
    if (hasWarrantyItem) return false;

    // 4. Status must map to Pending or Processing
    const key = getStatusKey(order?.order_status);
    const allowed = new Set([
      "ordered",          // → Pending
      "order placed",     // → Pending
      "order accepted",   // → Processing
      "billed",           // → Processing (creates waiting request)
    ]);
    return allowed.has(key);
  };

  const getStatusBadge = (status) => {
    const key = getStatusKey(status);
    // Spec mapping: ordered/Order Placed → Pending, Order Accepted/Billed → Processing
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      cancelled: "bg-rose-100 text-rose-800",
      shipped: "bg-indigo-100 text-indigo-800",
      "order placed": "bg-amber-100 text-amber-800",
      failure: "bg-red-100 text-red-800",
      payment_initialized: "bg-slate-100 text-slate-800",
      "payment initiated": "bg-slate-100 text-slate-800",
      "order accepted": "bg-sky-100 text-sky-800",
      complete: "bg-green-100 text-green-800",
      ordered: "bg-amber-100 text-amber-800",
      billed: "bg-sky-100 text-sky-800",
    };
    const labels = {
      pending: "Pending",
      cancelled: "Cancelled",
      shipped: "Shipped",
      "order placed": "Pending",
      failure: "Failure",
      payment_initialized: "Payment Initialized",
      "payment initiated": "Payment Initiated",
      "order accepted": "Processing",
      complete: "Completed",
      ordered: "Pending",
      billed: "Processing",
    };
    return {
      className: styles[key] || "bg-gray-100 text-gray-800",
      label: labels[key] || status || "Pending",
    };
  };

  const handleBuyAgain = () => {
    router.push('/');
  };

  const CANCEL_REASONS = [
    { value: "price too high", label: "Item Price/shipping cost is too high" },
    { value: "bought elsewhere", label: "Bought it from somewhere else" },
    { value: "mistake", label: "Order placed by mistake" },
    { value: "change address", label: "Need to change shipping address" },
    { value: "others", label: "My reason is not listed" },
  ];

  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setCancelReason("");
    setCancelComments("");
    setCancelFeedback(null);
    setCancelSubmitting(false);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (cancelSubmitting) return;

    if (!cancelReason.trim()) {
      setCancelFeedback({ type: "error", message: "Please select a reason" });
      return;
    }

    setCancelSubmitting(true);
    setCancelFeedback(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch("/api/cancel_order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reason: cancelReason,
          comments: cancelComments,
          cancel_order_number: selectedOrder?.order_number || "",
          cancel_order_id: selectedOrder?._id || "",
          customer_id: selectedOrder?.user_id || "",
          order_status: selectedOrder?.order_status || "",
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.result || "something is wrong. Please try again later!");
      }

      const resultText = String(data?.result || "").trim();
      if (resultText === "Success") {
        const isCancelled = data?.order_status === "Cancelled";
        setCancelFeedback({
          type: "success",
          message: isCancelled
            ? "Your order has been cancelled successfully."
            : "Your cancellation request has been submitted. We will notify you once it is processed.",
        });
        // Update local state: mark cancel_exists so button hides, update status if cancelled
        setAllOrders((prev) =>
          prev.map((order) =>
            order._id === selectedOrder._id
              ? {
                  ...order,
                  order_status: isCancelled ? "Cancelled" : order.order_status,
                  cancel_exists: true,
                }
              : order
          )
        );
        setTimeout(() => {
          setShowCancelConfirm(false);
          setSelectedOrder(null);
          setCancelReason("");
          setCancelComments("");
          setCancelFeedback(null);
          setCancelSubmitting(false);
        }, 2500);
        return;
      }

      setCancelFeedback({
        type: "error",
        message: resultText || data?.message || "something is wrong. Please try again later!",
      });
      setCancelSubmitting(false);
    } catch (error) {
      console.error(error);
      setCancelFeedback({
        type: "error",
        message: error.message || "something is wrong. Please try again later!",
      });
      setCancelSubmitting(false);
    }
  };

  const handleCancelReject = () => {
    if (cancelSubmitting) return;
    setShowCancelConfirm(false);
    setSelectedOrder(null);
    setCancelReason("");
    setCancelComments("");
    setCancelFeedback(null);
  };

  const pageCount = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const paginate = (page) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <ToastContainer
        containerId={ORDER_TOAST_ID}
        position="top-right"
        autoClose={false}
        closeOnClick={false}
      />
      
      
      {/* Mobile Header */}
      <div className="lg:hidden bg-white py-4 px-4 shadow-sm flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">My Orders</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFetchExistOrders}
            disabled={fetchingOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium disabled:opacity-50"
          >
            <FiRefreshCw className={fetchingOrders ? "animate-spin" : ""} />
            {fetchingOrders ? "Fetching..." : "Fetch"}
          </button>
          {/* <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            LatesOrdersFetched
          </span> */}
        </div>
      </div>
      
      {/* Desktop Header */}
      <div className="hidden lg:block bg-red-50 py-6 px-8 flex justify-between items-center border-b border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
        <div className="flex items-center space-x-2 text-sm mt-1">
          <span className="text-gray-600">🏠 Home</span>
          <FiChevronRight className="text-gray-400" />
          <span className="text-gray-500">Shop</span>
          <FiChevronRight className="text-gray-400" />
          <span className="text-red-600 font-medium">Orders</span>
        </div>
      </div>

      <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block w-full lg:w-72 flex-shrink-0">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-red-600 transition-all duration-300 shadow-sm">
              <h3 className="text-lg font-semibold text-red-600 mb-6 pb-2 border-b border-gray-100">My Account</h3>
              <nav className="space-y-2">
                <Link href="/orders" className="w-full flex items-center gap-2 px-5 py-3 text-base font-medium text-gray-600 rounded-lg hover:text-red-600 hover:bg-red-50 hover:pl-6 transition-all">
                  <HiShoppingBag className="text-red-600 text-xl" />
                  <span>Orders</span>
                </Link>
                <Link href="/wishlist" className="w-full flex items-center gap-2 px-5 py-3 text-base font-medium text-gray-600 rounded-lg hover:text-red-600 hover:bg-red-50 hover:pl-6 transition-all">
                  <FaHeart className="text-red-600 text-xl" />
                  <span>Wishlist</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 hover:border-red-600 transition-all duration-300 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Your orders</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchExistOrders}
                    disabled={fetchingOrders}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                    title="Fetch exist orders"
                  >
                    <FiRefreshCw className={fetchingOrders ? "animate-spin" : ""} />
                    {fetchingOrders ? "Fetching..." : "Fetch"}
                  </button>
                  {/* <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                    LatesOrdersFetched
                  </span> */}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 sm:mb-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Total orders</p>
                  <p className="text-xl font-semibold text-gray-900">{orderCounts.total}</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-700">Exist orders</p>
                  <p className="text-xl font-semibold text-blue-800">{orderCounts.exist}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700">New website orders</p>
                  <p className="text-xl font-semibold text-emerald-800">{orderCounts.newOrders}</p>
                </div>
              </div>
              {/* Order Filters — All + Cancelled only.
                  To restore Pending / Shipped / Delivered tabs, uncomment them in the array below. */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 pb-2 sm:pb-4 border-b border-gray-100 overflow-x-auto pb-2">
                {['all', /* 'pending', 'shipped', 'delivered', */ 'cancelled'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center whitespace-nowrap ${
                      activeFilter === filter
                        ? filter === 'all'
                          ? 'bg-customBlue text-white'
                          : filter === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : filter === 'shipped'
                          ? 'bg-red-100 text-[#d72828]'
                          : filter === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {/* {filter === 'pending' && <FiClock className="mr-1" />} */}
                    {/* {filter === 'shipped' && <FiTruck className="mr-1" />} */}
                    {/* {filter === 'delivered' && <FiCheckCircle className="mr-1" />} */}
                    {filter === 'cancelled' && <FiXCircle className="mr-1" />}
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {/* Orders List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-customBlue mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading your orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <FiShoppingBag className="mx-auto text-4xl text-gray-300 mb-3 sm:mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">No orders found</h3>
                  <p className="text-gray-500 mt-1 text-sm sm:text-base">
                    {activeFilter === 'all' 
                      ? "You haven't placed any orders yet" 
                      : `No ${activeFilter} orders found`}
                  </p>
                  <Link href="/" className="mt-4 sm:mt-6 inline-block px-4 sm:px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {paginatedOrders.map((order) => {
                    const statusKey = getStatusKey(order.order_status);
                    const paymentLabel = getPaymentStatusLabel(order);
                    const paymentMethodLabel = getPaymentMethodLabel(order);

                    // Stepper: determine current step index
                    const STEPPER_STEPS = [
                      { key: "ordered", label: "Ordered" },
                      { key: "order placed", label: "Order Placed" },
                      { key: "order accepted", label: "Order Accepted" },
                      { key: "billed", label: "Order Billed" },
                    ];
                    const activeStepIndex = STEPPER_STEPS.findIndex(
                      (s) => s.key === statusKey
                    );
                    const isOrderComplete =
                      ["complete", "completed"].includes(statusKey) ||
                      ["complete", "completed"].includes(String(order?.status || order?.order_status || "").toLowerCase().trim());
                    const isCancelledOrFailure = statusKey === "cancelled" || statusKey === "failure" || isOrderComplete;

                    const firstItem = order.order_item?.[0] || {};
                    const sellingPrice = firstItem.price || firstItem.product_price || order.order_amount;
                    const checkoutDiscount = firstItem.coupondiscount || 0;
                    const quantity = firstItem.quantity || 1;
                    const firstItemVariations = getItemVariations(firstItem);
                    const orderWarranties = (order.order_item || [])
                      .map((item) => getItemWarranty(item))
                      .filter(Boolean);
                    const orderExchangeTotal = (order.order_item || []).reduce((sum, item) => {
                      const amount = Number(
                        item.exchangeOffer?.price ||
                          item.exchange_off_amount ||
                          item.eo_amount ||
                          0
                      );
                      return sum + amount * (Number(item.quantity) || 1);
                    }, 0);

                    const formatDate = (d) => {
                      if (!d) return "N/A";
                      const dt = new Date(d);
                      if (Number.isNaN(dt.getTime())) return "N/A";
                      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
                    };
                    const formatTime = (d) => {
                      if (!d) return "N/A";
                      const dt = new Date(d);
                      if (Number.isNaN(dt.getTime())) return "N/A";
                      return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                    };

                    return (
                    <div key={order._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                      {/* ── Header Bar: Order ID + Request Cancel ── */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-sm sm:text-base font-bold text-gray-800 tracking-wide">
                          {order.order_number || order._id}
                        </h4>
                        <div className="flex items-center gap-3">
                          {canCancelOrder(order) && (
                            <button
                              onClick={() => handleCancelClick(order)}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                            >
                              Request Cancel
                            </button>
                          )}
                          {String(order.type || "online").trim().toLowerCase() === "offline" && order.invoice && (
                            <a
                              href={order.invoice}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors flex items-center gap-1"
                            >
                              Download Invoice
                            </a>
                          )}
                          {statusKey === "cancelled" && (
                            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Cancelled</span>
                          )}
                          {statusKey === "failure" && (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Failure</span>
                          )}
                          {isOrderComplete && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Completed</span>
                          )}
                        </div>
                      </div>

                      {/* ── Body: Image | Details | Meta ── */}
                      <div className="flex flex-col lg:flex-row p-4 gap-4 lg:gap-5">
                        {/* Product Image */}
                        <div className="w-28 sm:w-32 lg:w-36 flex-shrink-0 mx-auto lg:mx-0">
                          {firstItem.image ? (
                            <img
                              src={getImageUrl(firstItem.image)}
                              alt={firstItem.name || firstItem.product_name || "Product"}
                              className="w-full h-28 sm:h-32 object-contain rounded border border-gray-100"
                            />
                          ) : (
                            <div className="w-full h-28 sm:h-32 bg-gray-50 rounded border border-gray-100 flex items-center justify-center">
                              <FiShoppingBag className="text-2xl text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Details (middle column) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-1.5 leading-snug">
                            {firstItem.name || firstItem.product_name || "Product"}
                            {order.order_item?.length > 1 && (
                              <span className="text-gray-500 font-normal"> + {order.order_item.length - 1} more</span>
                            )}
                          </h3>

                          {firstItemVariations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {firstItemVariations.map((v, vIdx) => (
                                <span
                                  key={vIdx}
                                  className="inline-flex items-center gap-1 bg-gray-100/90 border border-gray-200/90 text-gray-800 text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-md"
                                >
                                  <span className="text-gray-500 font-normal">{v.key}:</span>
                                  <span className="font-semibold text-gray-900">{v.value}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-lg sm:text-xl font-bold text-[#d72828] mb-2">
                            ₹ {Number(order.order_amount || 0).toLocaleString("en-IN")}
                          </p>

                          {/* Warranty — same style as cart */}
                          {orderWarranties.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {orderWarranties.map((w, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-2 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1 text-xs w-fit shadow-2xs"
                                >
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold text-amber-950">{w.title}</span>
                                  </div>
                                  {w.price > 0 && (
                                    <span className="bg-amber-100/90 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                                      +₹{Number(w.price).toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {orderExchangeTotal > 0 && (
                            <div className="mb-2">
                              <div className="inline-flex items-center gap-2 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-lg px-2.5 py-1 text-xs w-fit shadow-2xs">
                                <span className="font-semibold text-emerald-950">Exchange Value</span>
                                <span className="bg-emerald-100/90 text-emerald-900 font-bold px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                                  −₹{Number(orderExchangeTotal).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Detail rows - table style for clean alignment */}
                          <table className="text-xs sm:text-sm text-gray-600 border-separate" style={{ borderSpacing: "0 2px" }}>
                            <tbody>
                              <tr>
                                <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Selling Price</td>
                                <td className="text-gray-500 pr-2 align-top">:</td>
                                <td className="font-medium text-gray-800">₹{Number(sellingPrice || 0).toLocaleString("en-IN")}</td>
                              </tr>
                              <tr>
                                <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Checkout Offer Discount</td>
                                <td className="text-gray-500 pr-2 align-top">:</td>
                                <td className="font-medium text-gray-800">₹{Number(checkoutDiscount || 0).toLocaleString("en-IN")}</td>
                              </tr>
                              <tr>
                                <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Quantity</td>
                                <td className="text-gray-500 pr-2 align-top">:</td>
                                <td className="font-medium text-gray-800">{quantity}</td>
                              </tr>
                              <tr>
                                <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Payment Method</td>
                                <td className="text-gray-500 pr-2 align-top">:</td>
                                <td className="font-medium text-gray-800">{paymentMethodLabel || "N/A"}{paymentLabel === "Paid" ? ` (${paymentLabel})` : ""}</td>
                              </tr>
                              {order.delivery_date && (
                                <tr>
                                  <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Estimated Delivery Date</td>
                                  <td className="text-gray-500 pr-2 align-top">:</td>
                                  <td className="font-medium text-gray-800">{formatDate(order.delivery_date)}</td>
                                </tr>
                              )}
                              {String(order.type || "online").trim().toLowerCase() !== "offline" && (
                                <tr>
                                  <td className="text-gray-500 pr-1 whitespace-nowrap align-top">Tracking Details</td>
                                  <td className="text-gray-500 pr-2 align-top">:</td>
                                  <td className="font-medium text-gray-800">
                                    {order.invenso_service_on && order.invenzo_shipment?.tracking_number
                                      ? order.invenzo_shipment.tracking_number
                                      : order.invenso_service_on && order.invenzo_shipment?.status
                                      ? String(order.invenzo_shipment.status).replace(/_/g, " ")
                                      : ""}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Right Meta Column */}
                        <div className="flex-shrink-0 lg:w-48 lg:border-l lg:border-gray-200 lg:pl-4">
                          <div className="flex flex-row lg:flex-col flex-wrap gap-3 lg:gap-3 text-xs sm:text-sm border-t lg:border-t-0 border-gray-100 pt-3 lg:pt-0">
                            <div>
                              <p className="text-gray-400 flex items-center gap-1 mb-0.5">
                                <FiClock className="text-[10px]" /> Order Date
                              </p>
                              <p className="font-medium text-gray-800">{formatDate(order.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 flex items-center gap-1 mb-0.5">
                                <FiClock className="text-[10px]" /> Created Time
                              </p>
                              <p className="font-medium text-gray-800">{formatTime(order.createdAt)}</p>
                            </div>
                            {order.pickup_type && (
                              <div>
                                <p className="text-gray-400 flex items-center gap-1 mb-0.5">
                                  <FiTruck className="text-[10px]" /> Store
                                </p>
                                <p className="font-medium text-gray-800">{order.pickup_type}</p>
                              </div>
                            )}
                            {order.store_id && !order.pickup_type && (
                              <div>
                                <p className="text-gray-400 flex items-center gap-1 mb-0.5">
                                  <FiTruck className="text-[10px]" /> Channel
                                </p>
                                <p className="font-medium text-gray-800">{order.store_id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Status Stepper ── */}
                      {!isCancelledOrFailure && String(order.type || "online").trim().toLowerCase() !== "offline" && (
                        <div className="px-4 pb-4 pt-2">
                          <div className="relative flex items-center justify-between">
                            {/* Background connector line */}
                            <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                            {/* Active connector line */}
                            {activeStepIndex > 0 && (
                              <div
                                className="absolute top-3 left-0 h-0.5 bg-[#d72828] z-10 transition-all duration-500"
                                style={{ width: `${(activeStepIndex / (STEPPER_STEPS.length - 1)) * 100}%` }}
                              />
                            )}

                            {STEPPER_STEPS.map((step, idx) => {
                              const isActive = idx === activeStepIndex;
                              const isCompleted = idx < activeStepIndex;
                              return (
                                <div key={step.key} className="relative z-20 flex flex-col items-center" style={{ width: `${100 / STEPPER_STEPS.length}%` }}>
                                  <div
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                      isActive
                                        ? "bg-[#d72828] border-[#d72828] shadow-md shadow-red-200"
                                        : isCompleted
                                        ? "bg-[#d72828] border-[#d72828]"
                                        : "bg-white border-gray-300"
                                    }`}
                                  >
                                    {(isActive || isCompleted) && (
                                      <FiCheckCircle className="text-white text-xs" />
                                    )}
                                  </div>
                                  <span className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight ${
                                    isActive ? "text-[#d72828] font-semibold" : isCompleted ? "text-[#d72828] font-medium" : "text-gray-400"
                                  }`}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Invenso shipment tracking (only when invenso_service_on + shipment/tracking data) ── */}
                      {order.invenso_service_on &&
                        String(order.type || "online").trim().toLowerCase() !== "offline" &&
                        (order.invenzo_tracking || order.invenzo_shipment) && (
                          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                <FiTruck className="text-[#d72828]" />
                                Order Tracking
                              </h3>
                              <div className="text-[11px] sm:text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                                {order.invenzo_shipment?.status && (
                                  <span>
                                    Status:{" "}
                                    <span className="font-medium text-gray-700 capitalize">
                                      {String(order.invenzo_shipment.status).replace(/_/g, " ")}
                                    </span>
                                  </span>
                                )}
                                {order.invenzo_shipment?.tracking_number && (
                                  <span>
                                    AWB:{" "}
                                    <span className="font-medium text-gray-700">
                                      {order.invenzo_shipment.tracking_number}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const updates = Array.isArray(order.invenzo_tracking?.tracking_updates)
                                ? [...order.invenzo_tracking.tracking_updates].reverse()
                                : [];
                              const rows =
                                updates.length > 0
                                  ? updates
                                  : order.invenzo_tracking
                                  ? [
                                      {
                                        status: order.invenzo_tracking.status,
                                        location: order.invenzo_tracking.location,
                                        time: null,
                                      },
                                    ]
                                  : [
                                      {
                                        status: order.invenzo_shipment?.status || "pending",
                                        location: "",
                                        time: null,
                                      },
                                    ];
                              return (
                                <ul className="space-y-2">
                                  {rows.map((upd, idx) => {
                                    const statusLabel = String(upd?.status || "")
                                      .replace(/_/g, " ")
                                      .trim();
                                    const loc =
                                      upd?.location != null ? String(upd.location).trim() : "";
                                    const timeRaw = upd?.time || null;
                                    let timeLabel = "";
                                    if (timeRaw) {
                                      const dt = new Date(timeRaw);
                                      timeLabel = Number.isNaN(dt.getTime())
                                        ? String(timeRaw)
                                        : dt.toLocaleString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          });
                                    }
                                    return (
                                      <li
                                        key={`${order._id}-invenso-${idx}`}
                                        className="flex gap-2 text-xs sm:text-sm text-gray-700"
                                      >
                                        <span className="mt-1.5 h-2 w-2 rounded-full bg-[#d72828] flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="font-medium capitalize text-gray-800">
                                            {statusLabel || "Update"}
                                            {loc ? (
                                              <span className="font-normal text-gray-600">
                                                {" "}
                                                — {loc}
                                              </span>
                                            ) : null}
                                          </p>
                                          {timeLabel ? (
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                              {timeLabel}
                                            </p>
                                          ) : null}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              );
                            })()}
                          </div>
                        )}

                      {/* Cancelled/Failure/Complete status bar */}
                      {isCancelledOrFailure && (
                        <div className={`px-4 py-2.5 text-xs font-medium ${
                          statusKey === "cancelled" ? "bg-rose-50 text-rose-700 flex items-center gap-1.5"
                          : statusKey === "failure" ? "bg-red-50 text-red-700 flex items-center gap-1.5"
                          : "bg-green-50 text-green-800 border-t border-green-100 flex flex-wrap items-center justify-between gap-3"
                        }`}>
                          {statusKey === "cancelled" && <><FiXCircle /> Order was cancelled on {formatDateTime(order.updatedAt)}</>}
                          {statusKey === "failure" && <><FiXCircle /> Payment failed on {formatDateTime(order.createdAt)}</>}
                          {isOrderComplete && (
                            <>
                              <div className="flex items-center gap-1.5 text-green-700">
                                <FiCheckCircle className="text-green-600 text-sm flex-shrink-0" />
                                <span>Order completed on {formatDateTime(order.updatedAt || order.createdAt)}</span>
                              </div>
                              <div>
                                {isOrderFullyReviewed(order) ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-green-100 text-green-800 border border-green-300 shadow-sm cursor-default">
                                    <FiCheckCircle className="text-green-600" /> Reviewed ✓
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReviewModal(order)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white text-green-800 border border-green-600 hover:bg-green-600 hover:text-white transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                                  >
                                    <FaStar className="text-amber-400" />
                                    <span>Write a Review</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {!loading && filteredOrders.length > 0 && (
                <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
                  <div className="text-sm text-gray-600">
                    Showing {filteredOrders.length > 0 ? startIndex + 1 : 0} to{" "}
                    {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of{" "}
                    {filteredOrders.length} entries
                  </div>

                  <div className="pagination flex items-center space-x-1">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                        currentPage === 1
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-black bg-white hover:bg-gray-100"
                      }`}
                      aria-label="Previous page"
                    >
                      «
                    </button>

                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                          currentPage === page
                            ? "bg-red-500 text-white"
                            : "text-black bg-white hover:bg-gray-100"
                        }`}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === pageCount || pageCount === 0}
                      className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                        currentPage === pageCount || pageCount === 0
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-black bg-white hover:bg-gray-100"
                      }`}
                      aria-label="Next page"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Cancellation Request Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 relative shadow-xl">
            <button
              type="button"
              onClick={handleCancelReject}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="text-xl font-semibold text-gray-800 mb-6 pr-8">
              Order Cancellation Request
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelSubmitting}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100"
                >
                  <option value="">Select Reason</option>
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments
                </label>
                <textarea
                  value={cancelComments}
                  onChange={(e) => setCancelComments(e.target.value)}
                  rows={4}
                  disabled={cancelSubmitting}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y disabled:bg-gray-100"
                />
              </div>

              {cancelFeedback && (
                <div
                  className={`text-sm rounded-md px-3 py-2 ${
                    cancelFeedback.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {cancelFeedback.message}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={cancelSubmitting}
                className="px-8 py-2.5 bg-[#d72828] hover:bg-[#c02020] text-white text-sm font-bold uppercase tracking-wide rounded disabled:opacity-50"
              >
                {cancelSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReviewOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseReviewModal}
              disabled={reviewSubmitting}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
              aria-label="Close"
            >
              ×
            </button>

            <div className="mb-4 pr-8">
              <div className="flex items-center gap-2 mb-1">
                <FaStar className="text-amber-500 text-lg" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                  Write a Review
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Order ID: <span className="font-semibold text-gray-700">{selectedReviewOrder.order_number || selectedReviewOrder._id}</span>
              </p>
            </div>

            {/* Product Selector for Orders with Multiple Items */}
            {selectedReviewOrder.order_item?.length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Select Item to Review ({selectedReviewOrder.order_item.length} items):
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedReviewOrder.order_item.map((item, idx) => {
                    const isSelected =
                      getItemProductId(selectedReviewItem) === getItemProductId(item) ||
                      (selectedReviewItem?.item_code && selectedReviewItem.item_code === item.item_code);
                    const isReviewed = isItemReviewed(item);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!reviewSubmitting) {
                            setSelectedReviewItem(item);
                            setReviewRating(0);
                            setHoverRating(0);
                            setReviewTitle("");
                            setReviewComments("");
                            setReviewFeedback(null);
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#d72828] bg-red-50/40 ring-1 ring-[#d72828]"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-10 h-10 flex-shrink-0 bg-white rounded border border-gray-100 flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img src={getImageUrl(item.image)} alt={item.name || item.product_name} className="w-full h-full object-contain" />
                          ) : (
                            <FiShoppingBag className="text-gray-400 text-base" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {item.name || item.product_name || "Product"}
                          </p>
                          <p className="text-xs text-gray-500">₹{Number(item.price || item.product_price || 0).toLocaleString("en-IN")}</p>
                        </div>
                        {isReviewed ? (
                          <span className="flex-shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiCheckCircle className="text-[10px]" /> Reviewed ✓
                          </span>
                        ) : (
                          <span className="flex-shrink-0 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            Select
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Product Card Preview */}
            {selectedReviewItem && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                <div className="w-12 h-12 flex-shrink-0 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  {selectedReviewItem.image ? (
                    <img src={getImageUrl(selectedReviewItem.image)} alt={selectedReviewItem.name || selectedReviewItem.product_name} className="w-full h-full object-contain" />
                  ) : (
                    <FiShoppingBag className="text-gray-400 text-lg" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2">
                    {selectedReviewItem.name || selectedReviewItem.product_name || "Product"}
                  </p>
                  <p className="text-xs font-bold text-[#d72828] mt-0.5">
                    ₹{Number(selectedReviewItem.price || selectedReviewItem.product_price || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}

            {/* If Item is Already Reviewed */}
            {isItemReviewed(selectedReviewItem) ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center my-3">
                <FiCheckCircle className="text-green-600 text-3xl mx-auto mb-2" />
                <h4 className="text-sm font-bold text-green-800 mb-1">
                  You have already reviewed this product!
                </h4>
                <p className="text-xs text-green-700">
                  Thank you for sharing your feedback. Your review has been saved and is published.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCloseReviewModal}
                    className="px-5 py-2 text-xs font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Rating Stars */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Overall Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (hoverRating || reviewRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        >
                          <FaStar
                            className={`text-2xl transition-colors ${
                              isFilled ? "text-amber-400 drop-shadow-sm" : "text-gray-200 hover:text-amber-200"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-medium text-gray-500 ml-2">
                      {reviewRating === 5 && "⭐ Excellent"}
                      {reviewRating === 4 && "⭐ Very Good"}
                      {reviewRating === 3 && "⭐ Good"}
                      {reviewRating === 2 && "⭐ Fair"}
                      {reviewRating === 1 && "⭐ Poor"}
                      {reviewRating === 0 && "(Click to rate)"}
                    </span>
                  </div>
                </div>

                {/* Review Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Review Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    disabled={reviewSubmitting}
                    placeholder="e.g. Excellent build quality, loved the features!"
                    maxLength={120}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#d72828] disabled:bg-gray-100 transition-colors"
                  />
                </div>

                {/* Review Comments */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Detailed Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    disabled={reviewSubmitting}
                    placeholder="What did you like or dislike about this product? How was the performance?"
                    rows={4}
                    maxLength={1000}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#d72828] disabled:bg-gray-100 resize-y transition-colors"
                  />
                </div>

                {reviewFeedback && (
                  <div
                    className={`text-xs rounded-lg px-3.5 py-2.5 border ${
                      reviewFeedback.type === "success"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {reviewFeedback.message}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseReviewModal}
                    disabled={reviewSubmitting}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-2 bg-[#d72828] hover:bg-[#c02020] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {reviewSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FaStar className="text-amber-300 text-xs" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
          error={authError}
        />
      )}
    </div>
  );
}