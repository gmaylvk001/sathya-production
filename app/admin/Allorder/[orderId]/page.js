'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { FaPhoneAlt, FaStore, FaCommentDots, FaCog, FaPaperPlane, FaCreditCard } from "react-icons/fa";
import { MdDateRange } from "react-icons/md";
import { IoWalletSharp } from "react-icons/io5";
import { IoMdMail } from "react-icons/io";
import { TbTruckDelivery } from "react-icons/tb";
import { MdOutlineLocalShipping, MdDeliveryDining, MdContacts } from "react-icons/md";

const OrderDetails = () => {
  const params = useParams();
  const orderId = params?.orderId;
  const [isUpdating, setIsUpdating] = useState(false);
  const [stores, setStores] = useState([]);
  const [assignStoreId, setAssignStoreId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assigningStore, setAssigningStore] = useState(false);
  const [assigningSalesPerson, setAssigningSalesPerson] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [roles, setRoles] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [remarks, setRemarks] = useState("");
  // FOR ORDER HISTORY
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  const [showHistoryCommentModal, setShowHistoryCommentModal] = useState(false);
  const [historyCommentDraft, setHistoryCommentDraft] = useState("");
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);

  const [order, setOrder] = useState(null);
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [refundType, setRefundType] = useState("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const isUniletOrder = String(order?.order_owner || "").trim().toLowerCase() === "unilet";
  const assignableStores = stores.filter((store) => {
    if (Number(store?.approved) !== 1) return false;
    const owner = String(store?.store_owner || "").trim().toLowerCase();
    return isUniletOrder ? owner === "unilet" : owner !== "unilet";
  });

  // const orderr = {
  //   history: [
  //     {
  //       date: '2025-07-22T12:00:00Z',
  //       comment: 'Order placed by user',
  //       status: 'Pending',
  //       customer_notified: true,
  //     },
  //     {
  //       date: '2025-07-23T08:30:00Z',
  //       comment: 'Order packed and ready to ship',
  //       status: 'Processing',
  //       customer_notified: false,
  //     },
  //     {
  //       date: '2025-07-23T14:00:00Z',
  //       comment: 'Order shipped via BlueDart',
  //       status: 'Shipped',
  //       customer_notified: true,
  //     },
  //   ],
  // };

  // 🔹 Fetch Stores
  useEffect(() => {
    fetch("/api/store_listings/get")
      .then(res => res.json())
      .then(data => {
        setStores(Array.isArray(data) ? data : data.data || []);
      })
      .catch(err => console.error("Store fetch error:", err));

    fetch("/api/roles/get")
      .then((res) => res.json())
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Roles fetch error:", err));

    fetch("/api/system_users/get")
      .then((res) => res.json())
      .then((data) => setSystemUsers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("System users fetch error:", err));
  }, []);

  // Admin Add Order History (exist Complete / Cancelled flow)
  const addHistory = async () => {
    if (!status) {
      toast.error("Please select a status");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders_new/${orderId}/add-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          comment,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to add history");
        return;
      }

      toast.success(data.message || "Order History Added Successfully!");
      setStatus("");
      setComment("");

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const refreshed = await fetch(`/api/orders_new/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((r) => r.json());
      if (refreshed && !refreshed.error) {
        setOrder(refreshed);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const sendOrderSms = async () => {
    const text = smsText.trim();
    if (!text) {
      toast.error("Please enter the Message");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setSendingSms(true);
    try {
      const res = await fetch(`/api/orders_new/${orderId}/send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.message || "SMS sending failed");
        return;
      }
      setSmsText("");
      toast.success(data.message || "Your Message has been Sent Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setSendingSms(false);
    }
  };

  const downloadInvoice = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setDownloadingInvoice(true);
    try {
      const res = await fetch(`/api/orders_new/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.message || "Invoice download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${order?.order_number || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const openHistoryCommentModal = (entry, index) => {
    setSelectedHistoryIndex(index);
    setHistoryCommentDraft(entry?.comment != null ? String(entry.comment) : "");
    setShowHistoryCommentModal(true);
  };

  const closeHistoryCommentModal = () => {
    setShowHistoryCommentModal(false);
    setSelectedHistoryIndex(null);
    setHistoryCommentDraft("");
  };

  // Save comment to order_history_comments (users_id = logged-in admin)
  const saveHistoryComment = async () => {
    const entry =
      selectedHistoryIndex != null && Array.isArray(order?.order_history)
        ? order.order_history[selectedHistoryIndex]
        : null;

    const commentText = String(historyCommentDraft || "").trim();
    if (!commentText) {
      toast.error("Please enter a comment");
      return;
    }
    if (!entry) {
      toast.error("History row not selected");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch("/api/order_history_comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_number: order?.order_number || entry.order_number || "",
          order_status: entry.status || entry.order_status || "",
          comment: commentText,
          order_history_id: entry._id || null,
          order_id: order?._id || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || "Failed to save comment");
        return;
      }

      toast.success("Comment saved");
      closeHistoryCommentModal();
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const historyRows = Array.isArray(order?.order_history) ? order.order_history : [];

  const refreshOrder = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`/api/orders_new/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data && !data.error) {
      setOrder(data);
      setAssignRoleId(data?.sales_person_role != null && data.sales_person_role !== "" ? String(data.sales_person_role) : "");
      setAssignUserId(data?.sales_person_id != null && data.sales_person_id !== "" ? String(data.sales_person_id) : "");
      setRemarks(data?.customer_comments != null ? String(data.customer_comments) : "");
    }
    return data;
  };

  const submitRefund = async () => {
    if (!orderId) return;
    if (refundType === "partial") {
      const amt = Number(refundAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error("Enter a valid refund amount");
        return;
      }
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setSubmittingRefund(true);
    try {
      const res = await fetch(`/api/orders_new/${orderId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refund_type: refundType,
          refund_amount: refundType === "partial" ? Number(refundAmount) : undefined,
          paymentid: order?.refund_payment_doc_id || null,
          order_number: order?.order_number || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        toast.success(data.message || "Amount Refunded Successfully!");
        setRefundType("full");
        setRefundAmount("");
        await refreshOrder();
      } else {
        toast.error(data.message || "Please try again!");
        await refreshOrder();
      }
    } catch (err) {
      console.error(err);
      toast.error("Please try again!");
    } finally {
      setSubmittingRefund(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      refreshOrder().catch((err) => console.error("Fetch error:", err));
    }
  }, [orderId]);

  const storeBranchCode = (store) =>
    String(store?.branch_code || store?.location_id || "").trim();

  useEffect(() => {
    if (!order || !stores.length) return;
    const uniletOrder = String(order.order_owner || "").trim().toLowerCase() === "unilet";
    const currentCode = String(order.pickup_type || "").trim();
    const matched = currentCode
      ? stores.find((store) => {
          if (Number(store?.approved) !== 1) return false;
          const owner = String(store?.store_owner || "").trim().toLowerCase();
          const sameOwner = uniletOrder ? owner === "unilet" : owner !== "unilet";
          return sameOwner && storeBranchCode(store) === currentCode;
        })
      : null;
    setAssignStoreId(matched ? String(matched._id) : "");
  }, [order, stores]);

  const handleAssignStore = async () => {
    const store = assignableStores.find((item) => String(item._id) === String(assignStoreId));
    const pickup_type = storeBranchCode(store);
    if (!assignStoreId || !store) {
      toast.error(isUniletOrder ? "Select a Unilet store" : "Select a Sathya store");
      return;
    }
    if (!pickup_type) {
      toast.error("Selected store has no branch code");
      return;
    }

    setAssigningStore(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/orders_new/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pickup_type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to assign store");
        return;
      }
      setOrder((prev) => ({ ...prev, pickup_type }));
      toast.success(`Store assigned (${pickup_type})`);
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setAssigningStore(false);
    }
  };

  const handleAssignSalesPerson = async () => {
    if (!assignRoleId || !assignUserId) {
      toast.error("Please select a role and user");
      return;
    }

    setAssigningSalesPerson(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/orders_new/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sales_person_role: assignRoleId,
          sales_person_id: assignUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to assign sales person");
        return;
      }
      setOrder((prev) => ({
        ...prev,
        sales_person_role: assignRoleId,
        sales_person_id: assignUserId,
      }));
      toast.success("Sales person assigned");
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setAssigningSalesPerson(false);
    }
  };

  const handlePlaceOrder = async () => {
    const assignedStore = String(order?.pickup_type || "").trim();
    if (!assignedStore) {
      toast.error("Please assign store first before Place Order");
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await fetch(`/api/orders_new/${orderId}/wondersoft-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to place order");
        return;
      }
      if (data.api_status === "SUCCESS") {
        toast.success(data.api_reason || "Order placed");
      } else {
        toast.error(data.api_reason || data.api_status || "Place order failed");
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const refreshed = await fetch(`/api/orders_new/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((r) => r.json());
      if (refreshed && !refreshed.error) {
        setOrder(refreshed);
        setRemarks(refreshed.customer_comments != null ? String(refreshed.customer_comments) : remarks);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred");
    } finally {
      setPlacingOrder(false);
    }
  };




  if (!order) return <p className="text-center mt-10">Loading...</p>;

  const currentOrderNumber = String(order.order_number || order.orderNumber || "").trim();
  const roleUsers = systemUsers.filter((user) => {
    const roleId = user.role?._id || user.role;
    return assignRoleId && String(roleId) === String(assignRoleId);
  });


  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto bg-white">
      {/* Title */}
      <h2 className="text-2xl font-semibold text-gray-700">Orders</h2>
      <ToastContainer />

      {/* Top Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left" colSpan={4}>Order Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <IoWalletSharp className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Payment:
                </td>
                <td className="p-2">{order.payment_method}</td>
              </tr>
              {order.payment_method == "online" && (
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                    <IoWalletSharp className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                    Payment Id:
                  </td>
                  <td className="p-2">{order.payment_id || 'Not available'}</td>
                </tr>
              )
              }
              {order.payment_refund?.refund_id ? (
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                    <FaCreditCard className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                    Refund ID :
                  </td>
                  <td className="p-2">{order.payment_refund.refund_id}</td>
                </tr>
              ) : null}
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <FaPhoneAlt className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Phone:
                </td>
                <td className="p-2">{order.order_phonenumber || "—"}</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <MdDateRange className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Date: </td>
                <td className="p-2 ">{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
              </tr>

              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <MdDeliveryDining className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Pickup:</td>
                <td className="p-2">
                  {order.delivery_type === "store" ? (
                    <span className="py-0.5 text-white px-2 bg-red-500 rounded">{order.delivery_type}</span>
                  ) : (
                    order.delivery_type
                  )}

                </td>
              </tr>
              <tr>
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <MdOutlineLocalShipping className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Shipping:</td>
                <td className="p-2"> Free Shipping</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Customer Details */}
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left" colSpan={2}>Customer Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <MdContacts className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Name:</td>
                <td className="p-2">{order.order_username}</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <FaPhoneAlt className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  Phone:</td>
                <td className="p-2">{order.customer_current_phone || "—"}</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <FaStore className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  store:</td>
                {/* <td className="p-2">{order.order_details?.[0]?.store_id}</td> */}
                <td className="p-2">
                  {
                    stores.find(s =>
                      String(s._id) === String(order?.order_details?.[0]?.store_id)
                    )?.organisation_name || ""
                  }
                </td>

              </tr>
              <tr className={order.customer_comments?.trim() ? "border-b" : ""}>
                <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                  <IoMdMail className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                  email:</td>
                <td className="p-2">{order.email_address}</td>
              </tr>
              {order.customer_comments?.trim() && (
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2 font-semibold text-gray-700">
                    <FaCommentDots className="bg-red-500 text-white p-1 rounded-md w-6 h-6" />
                    Comments:
                  </td>
                  <td className="p-2">{order.customer_comments}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Options / Invoice */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-lg text-gray-800">
            <FaCog className="w-4 h-4" />
            Options
          </div>
          <div className="px-2.5 pb-3">
            <div className="border-b border-gray-200 px-0.5 py-3 flex items-center justify-between text-base text-gray-800">
              <span>Invoice</span>
              <button
                type="button"
                onClick={downloadInvoice}
                disabled={!order?.file_path || downloadingInvoice}
                title={order?.file_path ? "Download Invoice" : "Invoice not generated yet"}
                aria-label="Download Invoice"
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[#4cae4c] bg-[#5cb85c] text-white hover:bg-[#449d44] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaCog className={`w-3 h-3 ${downloadingInvoice ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="pt-3">
              <textarea
                className="w-full border border-gray-500 rounded-sm p-2 text-sm focus:outline-none focus:border-blue-500"
                maxLength={160}
                rows={3}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
              />
              <p className="mt-1 text-sm text-red-600">Note: Maximum 160 Characters allowed</p>
              <button
                type="button"
                onClick={sendOrderSms}
                disabled={sendingSms}
                className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-[#2e6da4] bg-[#337ab7] px-2.5 py-1 text-sm text-white hover:bg-[#286090] disabled:opacity-60"
              >
                <FaPaperPlane className="w-3.5 h-3.5" />
                {sendingSms ? "Sending..." : "Send SMS"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exist Refund panel — only when Online + paid + Cancelled + never refunded */}
      {order.show_refund === "yes" ? (
        <div className="border border-gray-200 rounded overflow-hidden bg-white max-w-xl">
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 flex items-center gap-2">
            <FaCreditCard className="text-gray-600 w-4 h-4" />
            Refund
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 sm:w-32 shrink-0">Refund Type</span>
              <div className="flex items-center gap-6 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span>Partial</span>
                  <input
                    type="radio"
                    name="refund_type"
                    value="partial"
                    checked={refundType === "partial"}
                    onChange={() => setRefundType("partial")}
                    className="accent-blue-600"
                  />
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span>Full</span>
                  <input
                    type="radio"
                    name="refund_type"
                    value="full"
                    checked={refundType === "full"}
                    onChange={() => setRefundType("full")}
                    className="accent-blue-600"
                  />
                </label>
              </div>
            </div>

            {refundType === "partial" ? (
              <div id="refund_amnt_div" className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 sm:w-32 shrink-0">Enter Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Max ${order.order_amount || ""}`}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ) : null}

            <input type="hidden" name="paymentid" value={order.refund_payment_doc_id || ""} readOnly />
            <input type="hidden" name="order_number" value={order.order_number || ""} readOnly />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitRefund}
                disabled={submittingRefund}
                className="bg-[#337ab7] hover:bg-[#286090] text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-60"
              >
                {submittingRefund ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="border border-gray-200 rounded overflow-hidden bg-white">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-[10px] text-gray-500">i</span>
            Assign to store ({currentOrderNumber})
          </div>
          <div className="p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select {isUniletOrder ? "Unilet" : "Sathya"} store
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <select
                value={assignStoreId}
                onChange={(e) => setAssignStoreId(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">Choose</option>
                {assignableStores.map((store) => {
                  const code = storeBranchCode(store);
                  const label = store.title || store.organisation_name || store.store_name || store.name || "Store";
                  return (
                    <option key={store._id} value={store._id}>
                      {code ? `${label} (${code})` : label}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={handleAssignStore}
                disabled={assigningStore}
                className="sm:w-56 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {assigningStore ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded overflow-hidden bg-white">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-[10px] text-gray-500">i</span>
            Assign Sales Person ({currentOrderNumber})
          </div>
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Role</label>
                <select
                  value={assignRoleId}
                  onChange={(e) => {
                    setAssignRoleId(e.target.value);
                    setAssignUserId("");
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="">Choose</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select User</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  disabled={!assignRoleId}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100"
                >
                  <option value="">Choose</option>
                  {roleUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {[user.name, user.last_name].filter(Boolean).join(" ") || user.email || "User"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAssignSalesPerson}
                disabled={assigningSalesPerson}
                className="lg:w-56 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {assigningSalesPerson ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded overflow-hidden bg-white">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-[10px] text-gray-500">i</span>
            Remarks ({currentOrderNumber})
          </div>
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y"
                />
              </div>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="lg:w-56 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {placingOrder ? "Placing..." : "PlaceOrder"}
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Order Info */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="font-semibold text-gray-600 border-b pb-2">Order #{order.order_number}</h3>
        {/* Address */}
        <div className="mt-4">
          <table className="w-full border text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left">Delivery Address</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">{order.order_deliveryaddress}</td>
              </tr>
            </tbody>
          </table>
        </div>



        {/* Product Table */}
        <div className="mt-4">
          <table className="w-full border text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Model</th>
                {isUniletOrder && <th className="p-2 text-left">Vendor Item Code</th>}
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_details?.map((item, i) => {
                // Log each item for debugging
                console.log(`Item ${i}:`, item);

                // Calculate the price - use order_amount if product_price is 0
                const itemPrice = item.product_price === 0 ? parseFloat(order.order_amount) : item.product_price;
                const totalPrice = item.quantity * itemPrice;

                return (
                  <tr key={i} className="border-b">
                    <td className="p-2">
                      {item.slug ? (
                        <a
                          href={`/product/${item.slug}`}
                          className="text-[#d72828] hover:text-[#c02020] hover:underline"
                        >
                          {item.product_name} - ({item.item_code.replace(/^ITEM/, "")})
                        </a>
                      ) : (
                        <span>
                          {item.product_name} - ({item.item_code.replace(/^ITEM/, "")})
                        </span>
                      )}
                    </td>
                    <td className="p-2">{item.model}</td>
                    {isUniletOrder && <td className="p-2">{item.vendor_item_code || "-"}</td>}
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right text-red-600">₹{itemPrice}</td>
                    <td className="p-2 text-right text-red-600">₹{totalPrice}</td>
                  </tr>
                );
              })}
              {(order.order_item || []).map((item, index) =>
                item.extendedWarranty > 0 && (
                  <tr key={index} className="font-semibold">
                    <td colSpan={isUniletOrder ? 5 : 4} className="p-2 text-right text-[#d72828]">
                      Extended Warranty:
                    </td>
                    <td className="p-2 text-right text-red-600">
                      ₹{item.extendedWarranty}
                    </td>
                  </tr>
                )
              )}

              {(() => {
                // Line prices are gross; order_amount is already net of exchange — show the deduction.
                const lines = (order.order_details?.length
                  ? order.order_details
                  : order.order_item) || [];
                const fromLines = lines.reduce((sum, item) => {
                  const unit =
                    Number(
                      item.exchange_off_amount ??
                        item.eo_amount ??
                        item.exchangeOffer?.price ??
                        0
                    ) || 0;
                  const qty = Number(item.quantity) || 1;
                  return sum + unit * qty;
                }, 0);
                const exchangeTotal =
                  fromLines > 0 ? fromLines : Number(order.eo_discount) || 0;
                if (exchangeTotal <= 0) return null;
                return (
                  <tr className="font-semibold">
                    <td colSpan={isUniletOrder ? 5 : 4} className="p-2 text-right text-green-700">
                      Exchange Value:
                    </td>
                    <td className="p-2 text-right text-green-700">
                      −₹{exchangeTotal}
                    </td>
                  </tr>
                );
              })()}

              <tr className="font-semibold">
                <td colSpan={isUniletOrder ? 5 : 4} className="p-2 text-right">Sub-Total:</td>
                <td className="p-2 text-right">₹{order.order_amount}</td>
                {/* <td className="p-2 text-right">₹0.00</td> */}
              </tr>
              <tr>
                <td colSpan={isUniletOrder ? 5 : 4} className="p-2 text-right">Shipping:</td>
                {/* <td className="p-2 text-right">₹{order.shipping_fee}</td> */}
                <td className="p-2 text-right">₹0.00</td>
              </tr>
              <tr className="font-bold bg-gray-100">
                <td colSpan={isUniletOrder ? 5 : 4} className="p-2 text-right">Total:</td>
                <td className="p-2 text-right">₹{order.order_amount}</td>
              </tr>
            </tbody>

          </table>
        </div>
      </div>

      {/* Order History — view only (save logic next) */}
      <div className="bg-white p-4 shadow rounded space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-gray-600">Order History</h3>
          <button
            type="button"
            className="bg-red-500 text-white px-4 py-1.5 rounded text-sm font-medium"
          >
            History
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border text-gray-700">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2 text-left">Date Added</th>
                <th className="p-2 text-left">Comment</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Customer Notified</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr className="border-b">
                  <td className="p-3 text-gray-400 text-center" colSpan={4}>
                    No history yet
                  </td>
                </tr>
              ) : (
                historyRows.map((entry, i) => (
                  <tr key={entry._id || i} className="border-b">
                    <td className="p-2 whitespace-nowrap">
                      {entry.date || entry.created_at
                        ? new Date(entry.date || entry.created_at).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-700">{entry.comment || ""}</span>
                        <button
                          type="button"
                          onClick={() => openHistoryCommentModal(entry, i)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded whitespace-nowrap shrink-0"
                        >
                          Add Comment
                        </button>
                      </div>
                    </td>
                    <td className="p-2">{entry.status || entry.order_status || "—"}</td>
                    <td className="p-2 text-center">
                      {entry.notify != null
                        ? Number(entry.notify)
                        : entry.customer_notified != null
                          ? Number(entry.customer_notified)
                          : 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-semibold text-gray-600 border-b pb-2">Add Order History</h4>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">Choose</option>
              {(() => {
                // Exist Add History dropdown matrix (normal dropdown)
                const current = String(order?.order_status || "").trim().toLowerCase();
                const isFinal = current === "cancelled" || current === "canceled" || current === "complete";
                const cancelDisabled =
                  isFinal || current === "billed";
                const completeDisabled = isFinal;
                // ordered / Order Placed / Order Accepted → both enabled
                return (
                  <>
                    <option value="Cancelled" disabled={cancelDisabled}>
                      Cancelled{cancelDisabled ? " (not allowed)" : ""}
                    </option>
                    <option value="Complete" disabled={completeDisabled}>
                      Complete{completeDisabled ? " (not allowed)" : ""}
                    </option>
                  </>
                );
              })()}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              rows={4}
              placeholder=""
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addHistory}
              disabled={isUpdating}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              Add History
            </button>
          </div>
        </div>
      </div>

      {/* Order History Comment popup — view only */}
      {showHistoryCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeHistoryCommentModal}
          />
          <div className="relative bg-white rounded-md shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Order History Comment
              </h3>
              <button
                type="button"
                onClick={closeHistoryCommentModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-5">
              <div className="flex gap-3 items-start">
                <label className="text-sm text-gray-700 pt-2 w-20 shrink-0">
                  Comment
                </label>
                <textarea
                  value={historyCommentDraft}
                  onChange={(e) => setHistoryCommentDraft(e.target.value)}
                  rows={5}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-md">
              <button
                type="button"
                onClick={closeHistoryCommentModal}
                className="px-4 py-2 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveHistoryComment}
                disabled={isUpdating}
                className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
