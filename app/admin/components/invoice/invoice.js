import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function InvoicePage() {
  const router = useRouter();
  const { orderId } = router.query;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchInvoiceDetails(orderId);
    }
  }, [orderId]);

  const fetchInvoiceDetails = async (id) => {
    try {
      const res = await fetch(`/api/orders/get-single?order_id=${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        alert("Order not found");
        router.push("/shipped-orders");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      router.push("/shipped-orders");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return order?.order_details?.reduce((sum, item) => sum + item.product_price * item.quantity, 0).toFixed(2);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  if (!order) return <div className="p-6">No order found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Invoice #{order.order_number}</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold">Order Info</h3>
          <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
          <p>Status: {order.order_status}</p>
          <p>Payment: {order.payment_status}</p>
        </div>
        <div>
          <h3 className="font-semibold">Customer</h3>
          <p>Name: {order.order_username}</p>
          <p>Email: {order.email_address}</p>
          <p>Phone: {order.order_phonenumber}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Delivery Address</h3>
        <p>{order.order_deliveryaddress}</p>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Items</h3>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_details?.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{item.product_name}</td>
                <td className="p-2">{item.model || '-'}</td>
                <td className="p-2 text-right">₹{item.product_price}</td>
                <td className="p-2 text-right">{item.quantity}</td>
                <td className="p-2 text-right">₹{(item.product_price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span>₹{calculateTotal()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping:</span>
            <span>₹0.00</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>₹{calculateTotal()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
