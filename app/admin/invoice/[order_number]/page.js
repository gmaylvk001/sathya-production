'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MdLocalShipping, MdPayment, MdPerson, MdEmail, MdPhone } from 'react-icons/md';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import moment from 'moment';

export default function Invoice() {
  const params = useParams();
  const router = useRouter();
  const order_number = params?.order_number;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!order_number) {
      setError("Order number is missing from URL");
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [order_number]);

  const fetchOrder = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/orders/getorder?order_number=${order_number}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch order");
      if (data.success && data.orders.length > 0) {
        setOrder(data.orders[0]);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      setError(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };
// Add this function inside your Invoice component:
const handlePrint = () => {
  const printContents = document.getElementById('invoice-content').innerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  window.location.reload(); // reload to restore React state and event listeners
};

  const calculateOrderTotal = () => {
    if (!order?.order_details) return 0;
    return order.order_details.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  };

  const downloadPDF = async () => {
    const buttons = document.querySelectorAll('.no-print');
    buttons.forEach(btn => btn.style.display = 'none');

    const input = document.getElementById('invoice-content');
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(input, { scale: 2, logging: true, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`invoice_${order_number}.pdf`);
    } finally {
      buttons.forEach(btn => btn.style.display = '');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
        <span className="ml-4">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Link href="/admin/orders" className="mt-4 inline-flex items-center gap-2 text-[#d72828] hover:underline">
          <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-3 mt-3">
        <h1 className="text-2xl font-bold">Invoice List</h1>
      </div>

      <div id="invoice-content" className="bg-white shadow-md rounded-lg mb-3 p-4">
        {/* Buttons excluded from PDF */}
        <div className="flex gap-2 justify-end mb-3 no-print">
          <button
            onClick={downloadPDF}
            className="bg-[#d72828] hover:bg-[#d72828] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Icon icon="material-symbols:download" className="w-5 h-5" />
            Download PDF
          </button>
          <Link
            href="/admin/Allorder"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
            Back to Orders
          </Link>
          <Link
            href="#"
            onClick={(e) => {
                e.preventDefault();
                handlePrint();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded flex items-center gap-2 no-print"
            >
            <Icon icon="mdi:printer" className="w-5 h-5" />
            Print
        </Link>

        </div>

        <hr className="border-t border-gray-200 mb-4" />

        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">
              Invoice <span className="text-black">#{order.order_number}</span>
            </h1>
            <p className="text-sm text-gray-600">Date Issued: {moment(order.createdAt).format('DD/MM/YYYY')}</p>
            <p className="text-sm text-gray-600">Date Due: {/* Insert due date */}</p>
          </div>
          <div>
            <h2 className="font-bold text-lg">Sathya Stores</h2>
            <p className="text-sm text-gray-600">
              26/1 Dr.Alagappa Chettiyar Rd, Tatabad, Near Kovai Scan Centre,
            </p>
            <p className="text-sm text-gray-600">Coimbatore-641012</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <div className="">
            <h6 className="text-base font-semibold mb-2 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <MdPerson className="text-[#d72828]" /> Issued For:
              </span>
              
            </h6>
            <div className="text-sm text-secondary-light space-y-1">
              <div className="flex justify-between">
                <span>
                  <span className="font-medium">Name</span>
                  <span className="pl-2">: {order?.order_username || "Will Marthas"}</span>
                </span>
               
              </div>
              <div>
                <span className="font-medium">Address</span>
                <span className="pl-2 whitespace-pre-line">
                  : {order?.order_deliveryaddress || "4517 Washington Ave.\nUSA"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MdEmail className="text-gray-500" />
                <span className="font-medium">Email</span>
                <span className="pl-2">: {order?.email_address || "example@email.com"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MdPhone className="text-gray-500" />
                <span className="font-medium">Phone</span>
                <span className="pl-2">: {order?.order_phonenumber || "+1 543 2198"}</span>
              </div>
            </div>
          </div>
          <div className="w-[41%]">
            <span className="text-sm font-normal text-gray-600 block">
              Date: {order?.order_date || "May 27, 2025"}
            </span>
            <span className="block">
              <span className="font-medium">Order ID</span>
              <span className="pl-2">: {order?.order_id || "ORD12345678"}</span>
            </span>
          </div>

        </div>

        {/* Table */}
        <section className="mb-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 border-b pb-2">Order Details</h3>
          <div className="overflow-x-auto">
            <table className="table text-sm w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2">SL.</th>
                  <th className="border border-gray-300 px-4 py-2">Items</th>
                  <th className="border border-gray-300 px-4 py-2">Qty</th>
                  <th className="border border-gray-300 px-4 py-2">Price</th>
                  <th className="border border-gray-300 px-4 py-2">Special Price</th>
                  <th className="text-end border border-gray-300 px-4 py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {order.order_details?.map((item, i) => (
                  <tr key={i}>
                    <td className="border px-4 py-2">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="border px-4 py-2">{item.product_name}</td>
                    <td className="border px-4 py-2">{item.quantity}</td>
                    <td className="border px-4 py-2"></td>
                    <td className="border px-4 py-2">₹{item.product_price.toFixed(2)}</td>
                    <td className="border px-4 py-2 text-end">₹{(item.product_price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-right">Subtotal:</td>
                  <td className="px-4 py-2 text-end">₹{calculateOrderTotal().toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-right">Discount:</td>
                  <td className="px-4 py-2 text-end">₹0.00</td>
                </tr>
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-right">Tax:</td>
                  <td className="px-4 py-2 text-end">₹0.00</td>
                </tr>
                <tr className="font-semibold bg-gray-100">
                  <td colSpan="5" className="border px-4 py-2 text-right">Grand Total:</td>
                  <td className="border px-4 py-2 text-end">₹{calculateOrderTotal().toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap justify-between items-end mt-16">
          <div className="text-sm border-t inline-block px-3">Signature of Customer</div>
          <div className="text-sm border-t inline-block px-3">Signature of Authorized</div>
        </div>

        <div className="mt-12 pt-4 border-t text-center text-gray-500 text-sm">
          <p>Thank you for your order!</p>
        </div>
      </div>
    </div>
  );
}
