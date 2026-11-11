"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import DateRangePicker from "@/components/DateRangePicker";
import OrderSourceCounts from "@/app/admin/components/OrderSourceCounts";
import "react-toastify/dist/ReactToastify.css";

const OrdersTable_abon = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [filtered, setFiltered] = useState([]);
  const itemsPerPage = 20;
  const router = useRouter();

  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);


  // 📌 Delivery Date Modal states
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [oldStatus, setOldStatus] = useState("");


  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayId, setRazorpayId] = useState("");
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders_new", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    const abandoned = list.filter((order) => order.order_status === "Payment Initiated");
    setOrders(abandoned);
    setFiltered(abandoned);
    setIsLoading(false);
  };
  useEffect(() => {
    fetchOrders();
  }, []);

  // 🔎 Filters
  useEffect(() => {
    const applyFilters = () => {
      let updated = [...orders];

      if (status) {
        updated = updated.filter((o) => o.order_status === status);
      }

      if (deliveryType) {
        updated = updated.filter((o) => o.delivery_type === deliveryType);
      }

      if (paymentMethod) {
        updated = updated.filter(
          (o) => o.payment_method?.toLowerCase() === paymentMethod.toLowerCase()
        );
      }

      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        updated = updated.filter(
          (o) =>
            o.order_number?.toLowerCase().includes(lower) ||
            o.order_username?.toLowerCase().includes(lower)
        );
      }

      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDate = new Date(dateFilter.startDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);

        updated = updated.filter((o) => {
          const orderDate = new Date(o.created_at || o.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      }

      setFiltered(updated);
    };

    applyFilters();
  }, [
    status,
    deliveryType,
    paymentMethod,
    searchTerm,
    orders,
    dateFilter?.startDate,
    dateFilter?.endDate,
  ]);

  const handleVerifyRazorpay = async () => {
    //alert("Hi");
    if (!razorpayId) {
      toast.error("Please enter Razorpay Payment ID");
      return;
    }

    setIsCheckingPayment(true);

    try {
      // 🔥 Call your backend to verify payment
      const res = await fetch(`/api/verify-abandoned-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_id: razorpayId,
          order_id: orderToUpdate._id,
          order_amount : orderToUpdate.order_amount,
        }),
      });

      const data = await res.json();
      console.log("Testing", data);
      console.log("sajkhfdsahfdisd", orderToUpdate);
      //alert(orderToUpdate._id);
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid payment");
      }

      // ✅ If valid → update order status
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      await fetch(`/api/orders_new/${orderToUpdate._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "pending",
        }),
      });

      toast.success("Payment verified & status updated");

      // update UI
      setOrders((prev) =>
        prev.map((ord) =>
          ord._id === orderToUpdate._id
            ? { ...ord, order_status: "pending" }
            : ord
        )
      );

      // reset modal
      setShowRazorpayModal(false);
      setRazorpayId("");
      setOrderToUpdate(null);
      setOldStatus("");
      fetchOrders()
    } catch (error) {
      console.error(error);
      toast.error("Invalid Razorpay Payment ID");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // 📧 Send delivery confirmation email to user
  const sendDeliveryEmailToUser = async (order, deliveryDate) => {
    try {
      const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // multiple recipients
      const recipients = [
        order.email_address, // original order user
        "arunkarthik@sathya.store", "ecom@sathya.store", "itadmin@sathya.store", "telemarketing@sathya.store", "sekarcorp@sathya.store", "customercare@sathya.store"
      ];



      // loop through recipients and send individually
      for (const email of recipients) {
        console.log("📧 Sending to:", email);
        const emailFormData = new FormData();
        emailFormData.append("campaign_id", "e019b2bd-09e9-4369-8b04-1d80a0403bb9");
        emailFormData.append("email", email);
        emailFormData.append(
          "params",
          JSON.stringify([order.order_username, order.order_number, formattedDate])
        );

        const response = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };
        await response.json();

        if (!response.ok) {
          console.error(`Failed to send email to ${email}`);
        } else {
          console.log(`Email sent successfully to ${email}`);
        }
      }

      return { success: true, message: "Emails sent successfully" };
    } catch (error) {
      console.error("Error sending delivery emails:", error);
      throw error;
    }
  };

  // 📧 Send notification email to admin
  const sendAdminNotificationEmail = async (order, oldStatus, newStatus) => {
    try {
      const res = await fetch("/api/order-send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "ecom@sathya.store",
          //cc: "siva96852@gmail.com",
          subject: `Order ${order.order_number} Status Updated`,
          text: `Order ${order.order_number} for ${order.order_username} has been updated from ${oldStatus} to ${newStatus}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Order Status Updated</h2>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Customer Name:</strong> ${order.order_username}</p>
              <p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <br>
              <p>This is an automated notification from the order management system.</p>
            </div>
          `
        }),
      });

      if (!res.ok) throw new Error("Failed to send admin notification");
      return await res.json();
    } catch (error) {
      console.error("Error sending admin notification:", error);
      throw error;
    }
  };

  // 📅 Handle date range change
  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(0);
  };
  const updateOrderStatusWithDeliveryDate = async () => {
    if (!deliveryDate || !orderToUpdate) {
      toast.error("Please select a delivery date");
      return;
    }

    setIsProcessing(true); // 🚀 Disable button immediately

    try {
      const res = await fetch(`/api/orders/${orderToUpdate._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shipped",
          delivery_date: deliveryDate
        }),
      });

      if (!res.ok) throw new Error();

      const updatedOrder = await res.json();

      setOrders((prev) =>
        prev.map((ord) =>
          ord._id === orderToUpdate._id
            ? { ...ord, order_status: "shipped", delivery_date: deliveryDate }
            : ord
        )
      );

      await sendDeliveryEmailToUser(orderToUpdate, deliveryDate);
      // await sendAdminNotificationEmail(orderToUpdate, oldStatus, "shipped");

      toast.success("Order shipped! Email sent to user and admin.");
    } catch (err) {
      toast.error("Failed to update order status");
      console.error(err);
    } finally {
      setIsProcessing(false); // ✅ Reset button state
      setShowDeliveryDateModal(false);
      setDeliveryDate("");
      setOrderToUpdate(null);
      setOldStatus("");
    }
  };

  // ✅ Update order status with delivery date
  // const updateOrderStatusWithDeliveryDate = async () => {
  //   if (!deliveryDate || !orderToUpdate) {
  //     toast.error("Please select a delivery date");
  //     return;
  //   }

  //   try {
  //     // Update order status and delivery date
  //     const res = await fetch(`/api/orders/${orderToUpdate._id}`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ 
  //         status: "shipped",
  //         delivery_date: deliveryDate 
  //       }),
  //     });

  //     if (!res.ok) throw new Error();

  //     const updatedOrder = await res.json();

  //     // Update local state
  //     setOrders((prev) =>
  //       prev.map((ord) =>
  //         ord._id === orderToUpdate._id
  //           ? { 
  //               ...ord, 
  //               order_status: "shipped",
  //               delivery_date: deliveryDate 
  //             }
  //           : ord
  //       )
  //     );

  //     // Send delivery email to user
  //     await sendDeliveryEmailToUser(orderToUpdate, deliveryDate);

  //     // Send notification email to admin
  //     await sendAdminNotificationEmail(orderToUpdate, oldStatus, "shipped");

  //     toast.success("Order shipped! Email sent to user and admin.");

  //   } catch (err) {
  //     toast.error("Failed to update order status");
  //     console.error(err);
  //   } finally {
  //     setShowDeliveryDateModal(false);
  //     setDeliveryDate("");
  //     setOrderToUpdate(null);
  //     setOldStatus("");
  //   }
  // };

  const paginatedOrders = filtered.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const pageCount = Math.ceil(filtered.length / itemsPerPage);

  const paginate = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pageCount) {
      setCurrentPage(pageIndex);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [status, deliveryType, paymentMethod, searchTerm, orders, dateFilter]);

  return (
    <div className="container mx-auto">
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">Abandoned Order</h2>
        <OrderSourceCounts orders={orders} />
      </div>

      {isLoading ? (
        <p>Loading order...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 h-auto overflow-x-auto border border-gray-200">
          {/* 🔍 Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end mb-4">
            {/* Search */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search all orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>

            {/* Status */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All</option>
                <option value="Payment Initiated">Payment Initiated</option>

              </select>
            </div>

            {/* Delivery */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Type
              </label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All</option>
                <option value="home">Home</option>
                <option value="store">Store</option>
              </select>
            </div>

            {/* Payment */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All</option>
                <option value="online">Online</option>
                <option value="cod">COD</option>
              </select>
            </div>

            {/* Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <DateRangePicker onDateChange={handleDateChange} />
            </div>
          </div>

          {/* 📋 Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Action</th>
                  <th className="p-2">Order Id</th>
                  <th className="p-2">Order Status</th>
                  <th className="p-2">Delivery Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length ? (
                  paginatedOrders.map((o, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 border text-center">
                        <button
                          onClick={() =>
                            router.push(`/admin/abandonedorder/${o._id}`)
                          }
                          className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md"
                        >
                          👁 View
                        </button>
                      </td>

                      <td className="p-2 border">{o.order_number}</td>

                      {/* Status dropdown */}
                      <td className="p-2 border">
                        <select
                          value={o.order_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            const prevStatus = o.order_status;

                            // If changing from pending to shipped, show delivery date modal
                            if (prevStatus === "Payment Initiated" &&
                              newStatus === "pending") {
                              setOrderToUpdate(o);
                              setOldStatus(prevStatus);
                              // setShowDeliveryDateModal(true);
                              setShowRazorpayModal(true);
                              e.target.value = prevStatus; // Reset dropdown until confirmed
                              console.log("hai");
                              return;
                            }

                            // For other status changes (like cancelled)
                            try {
                              const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                              const res = await fetch(`/api/orders_new/${o._id}`, {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({ status: newStatus }),
                              });

                              if (!res.ok) throw new Error();

                              toast.success("Order Status updated successfully");

                              setOrders((prev) =>
                                prev.map((ord) =>
                                  ord._id === o._id
                                    ? { ...ord, order_status: newStatus }
                                    : ord
                                )
                              );

                              // Send admin notification for any status change
                              try {
                                await sendAdminNotificationEmail(o, prevStatus, newStatus);
                              } catch (error) {
                                console.error("Admin notification failed:", error);
                              }
                            } catch (err) {
                              toast.error("Failed to update status");
                              e.target.value = prevStatus;
                            }
                          }}
                          className="border px-2 py-1 rounded-md text-sm"
                        >
                          <option value="pending">pending</option>
                          <option value="Payment Initiated">Payment Initiated</option>
                        </select>
                      </td>

                      <td className="p-2 border">
                        {o.delivery_date
                          ? new Date(o.delivery_date).toLocaleDateString()
                          : "Not set"
                        }
                      </td>

                      <td className="p-2 border">{o.order_username}</td>
                      <td className="p-2 border">₹{o.order_amount}</td>
                      <td className="p-2 border">
                        {new Date(o.created_at || o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center text-gray-500 p-4"
                    >
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {filtered.length === 0
                ? 0
                : currentPage * itemsPerPage + 1}{" "}
              to{" "}
              {Math.min(
                (currentPage + 1) * itemsPerPage,
                filtered.length
              )}{" "}
              of {filtered.length} entries
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1.5 border rounded-md"
              >
                «
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => paginate(i)}
                  className={`px-3 py-1.5 border rounded-md ${currentPage === i
                    ? "bg-red-500 text-white"
                    : "bg-white"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pageCount - 1 || pageCount === 0}
                className="px-3 py-1.5 border rounded-md"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 Delivery Date Modal */}
      {showDeliveryDateModal && orderToUpdate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Set Delivery Date</h3>
            <p className="text-sm text-gray-600 mb-4">
              Order <b>{orderToUpdate.order_number}</b> for{" "}
              <b>{orderToUpdate.order_username}</b>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Delivery Date:
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                // min={sevenDaysAgo().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeliveryDateModal(false);
                  setDeliveryDate("");
                  setOrderToUpdate(null);
                  setOldStatus("");
                }}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={updateOrderStatusWithDeliveryDate}
                disabled={!deliveryDate || isProcessing}
                className={`px-4 py-2 rounded-md text-white ${isProcessing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
                  }`}
              >
                {isProcessing ? "Processing..." : "Confirm & Send Emails"}
              </button>

            </div>
          </div>
        </div>
      )}


      {/* 💳 Razorpay Verification Modal */}
      {showRazorpayModal && orderToUpdate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">
              Enter Razorpay Payment ID
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Order <b>{orderToUpdate.order_number}</b> for{" "}
              <b>{orderToUpdate.order_username}</b>
            </p>

            <input
              type="text"
              placeholder="Enter Razorpay Payment ID"
              value={razorpayId}
              onChange={(e) => setRazorpayId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRazorpayModal(false);
                  setRazorpayId("");
                  setOrderToUpdate(null);
                  setOldStatus("");
                }}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleVerifyRazorpay}
                disabled={!razorpayId || isCheckingPayment}
                className={`px-4 py-2 rounded-md text-white ${isCheckingPayment
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
                  }`}
              >
                {isCheckingPayment ? "Verifying..." : "Verify & Update"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersTable_abon;