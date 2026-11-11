"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

const ITEMS_PER_PAGE = 20;

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(4) : String(value);
}

export default function UniletNewProductComponent() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [productToRemove, setProductToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/admin/unilet-new-products", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setLoadError(data.error || "Failed to load products");
          setProducts([]);
        } else {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Unilet new products load error:", err);
        setLoadError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const pageCount = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProducts = products.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const pageIds = paginatedProducts.map((p) => String(p._id));
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelectPage = () => {
    setSelectedIds((prev) =>
      pageAllSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  const toggleSelectOne = (id) => {
    const key = String(id);
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const confirmBulkDelete = async () => {
    if (!selectedIds.length) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/unilet-new-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ text: data.error || "Failed to remove products", type: "error" });
      } else {
        const removed = new Set(selectedIds);
        const remaining = products.filter((p) => !removed.has(String(p._id)));
        setProducts(remaining);
        const lastPage = Math.max(Math.ceil(remaining.length / ITEMS_PER_PAGE) - 1, 0);
        setCurrentPage((prev) => Math.min(prev, lastPage));
        setSelectedIds([]);
        setMessage({ text: data.message || "Selected products removed", type: "success" });
      }
    } catch (err) {
      console.error("Unilet new products bulk delete error:", err);
      setMessage({ text: "Failed to remove products", type: "error" });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = products.map((p) => ({
      ItemCode: p.item_code || "",
      Quantity: p.quantity ?? "",
      MRP: p.price ?? "",
      MSP: p.spl_price ?? "",
      movement: p.movement || "",
      BrandCode: p.brand_code || "",
      description: p.item_description || "",
      Brand: p.brand || "",
      PropertyGroup: p.group_property || "",
      "Common Type": p.is_common_type ?? "",
      Created: formatDateTime(p.created_at),
      Updated: formatDateTime(p.updated_at),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "New Products");
    XLSX.writeFile(book, `unilet_new_products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const confirmRemove = async () => {
    if (!productToRemove) return;
    setIsRemoving(true);
    try {
      const res = await fetch(
        `/api/admin/unilet-new-products?id=${encodeURIComponent(productToRemove._id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ text: data.error || "Failed to remove product", type: "error" });
      } else {
        const remaining = products.filter((p) => p._id !== productToRemove._id);
        setProducts(remaining);
        setSelectedIds((prev) => prev.filter((id) => id !== String(productToRemove._id)));
        const lastPage = Math.max(Math.ceil(remaining.length / ITEMS_PER_PAGE) - 1, 0);
        setCurrentPage((prev) => Math.min(prev, lastPage));
        setMessage({ text: `${productToRemove.item_code} removed`, type: "success" });
      }
    } catch (err) {
      console.error("Unilet new product remove error:", err);
      setMessage({ text: "Failed to remove product", type: "error" });
    } finally {
      setIsRemoving(false);
      setProductToRemove(null);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0">
      <h2 className="text-3xl font-normal text-gray-800 mb-4">New Products</h2>
      <hr className="border-t border-gray-200 mb-5" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToExcel}
            disabled={!products.length}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-800 text-sm px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <Icon icon="mdi:download" className="text-base" />
            Export to Excel
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded"
            >
              <Icon icon="mdi:trash-can-outline" className="text-base" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          {selectedIds.length > 0 && selectedIds.length < products.length && (
            <button
              onClick={() => setSelectedIds(products.map((p) => String(p._id)))}
              className="text-sm text-blue-600 hover:underline"
            >
              Select all {products.length}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="text-sm text-gray-600 hover:underline">
              Clear selection
            </button>
          )}
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total Products: <span className="text-gray-900 font-bold">{isLoading ? "-" : products.length}</span>
        </div>
      </div>

      {message.text && (
        <div
          className={`mb-4 flex items-center justify-between rounded-md border px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: "", type: "success" })} aria-label="Close message">
            <Icon icon="mdi:close" />
          </button>
        </div>
      )}

      {isLoading ? (
        <p>Loading Products...</p>
      ) : loadError ? (
        <p className="text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm text-gray-800">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="p-2 w-8">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={toggleSelectPage}
                      disabled={!pageIds.length}
                      className="w-4 h-4 cursor-pointer"
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="p-2 font-medium">ItemCode</th>
                  <th className="p-2 font-medium">Quantity</th>
                  <th className="p-2 font-medium">MRP</th>
                  <th className="p-2 font-medium">MSP</th>
                  <th className="p-2 font-medium">movement</th>
                  <th className="p-2 font-medium">BrandCode</th>
                  <th className="p-2 font-medium">description</th>
                  <th className="p-2 font-medium">Brand</th>
                  <th className="p-2 font-medium">PropertyGroup</th>
                  <th className="p-2 font-medium">Common Type</th>
                  <th className="p-2 font-medium">Created</th>
                  <th className="p-2 font-medium">Updated</th>
                  <th className="p-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((p) => (
                    <tr
                      key={p._id}
                      className={`border-b border-gray-100 align-top ${selectedIds.includes(String(p._id)) ? "bg-red-50/60" : ""}`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(String(p._id))}
                          onChange={() => toggleSelectOne(p._id)}
                          className="w-4 h-4 cursor-pointer"
                          aria-label={`Select ${p.item_code || "product"}`}
                        />
                      </td>
                      <td className="p-2">{p.item_code || "-"}</td>
                      <td className="p-2">{p.quantity ?? "-"}</td>
                      <td className="p-2">{formatAmount(p.price)}</td>
                      <td className="p-2">{formatAmount(p.spl_price)}</td>
                      <td className="p-2">{p.movement || "-"}</td>
                      <td className="p-2">{p.brand_code || "-"}</td>
                      <td className="p-2 max-w-[220px]">{p.item_description || "-"}</td>
                      <td className="p-2">{p.brand || "-"}</td>
                      <td className="p-2">{p.group_property || "-"}</td>
                      <td className="p-2">{p.is_common_type ?? "-"}</td>
                      <td className="p-2 max-w-[100px]">{formatDateTime(p.created_at)}</td>
                      <td className="p-2 max-w-[100px]">{formatDateTime(p.updated_at)}</td>
                      <td className="p-2">
                        <button
                          onClick={() => setProductToRemove(p)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="14" className="text-center p-4">
                      No Products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
              <div className="text-sm text-gray-600">
                Showing {currentPage * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min((currentPage + 1) * ITEMS_PER_PAGE, products.length)} of {products.length} entries
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                  disabled={currentPage === 0}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                    currentPage === 0 ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
                  }`}
                  aria-label="Previous page"
                >
                  «
                </button>
                {Array.from({ length: pageCount }, (_, i) => {
                  const show = i === 0 || i === pageCount - 1 || Math.abs(currentPage - i) <= 1;
                  if (show) {
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                          currentPage === i ? "bg-red-500 text-white" : "text-black bg-white hover:bg-gray-100"
                        }`}
                        aria-current={currentPage === i ? "page" : undefined}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  if ((i === currentPage - 2 && i > 1) || (i === currentPage + 2 && i < pageCount - 2)) {
                    return (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount - 1))}
                  disabled={currentPage >= pageCount - 1}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                    currentPage >= pageCount - 1 ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
                  }`}
                  aria-label="Next page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {productToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-[90vw]">
            <h2 className="text-xl font-bold mb-4">Remove Product</h2>
            <p className="mb-4">
              Remove <strong>{productToRemove.item_code}</strong> from new products?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setProductToRemove(null)}
                disabled={isRemoving}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={confirmRemove}
                disabled={isRemoving}
                className="bg-red-500 px-4 py-2 rounded-md text-white disabled:opacity-60"
              >
                {isRemoving ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-[90vw]">
            <h2 className="text-xl font-bold mb-4">Remove Selected Products</h2>
            <p className="mb-4">
              Remove <strong>{selectedIds.length}</strong> selected product(s) from new products? This cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={isBulkDeleting}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isBulkDeleting}
                className="bg-red-500 px-4 py-2 rounded-md text-white disabled:opacity-60"
              >
                {isBulkDeleting ? "Removing..." : `Yes, Remove ${selectedIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
