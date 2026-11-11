"use client";

export default function OrderSourceCounts({ orders = [] }) {
  const existCount = orders.filter((order) => String(order.exist_id || "").trim()).length;
  const newCount = orders.length - existCount;

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-yellow-900"
        style={{ backgroundColor: "#fff59d" }}
      >
        Exist orders: {existCount}
      </span>
      <span className="inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-green-900 bg-green-100">
        New orders: {newCount}
      </span>
    </div>
  );
}
