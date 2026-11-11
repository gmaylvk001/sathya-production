"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

const SECTIONS = [
  {
    id: "filter-groups",
    label: "Filter Groups Upload",
    title: "Filter Groups Bulk Upload",
    description: "Excel columns: id, filter_grp_name, sort_order, slug",
    api: "/api/product/filter-bulk-upload/filter-groups",
    sampleType: "filter-groups",
  },
  {
    id: "filters",
    label: "Filters Upload",
    title: "Filters Bulk Upload",
    description: "Excel columns: id, filter_group_id, filter_name, slug",
    api: "/api/product/filter-bulk-upload/filters",
    sampleType: "filters",
  },
  {
    id: "product-filters",
    label: "Product Filters Upload",
    title: "Product Filters Bulk Upload",
    description: "Excel columns: id, product_id, filter_id",
    api: "/api/product/filter-bulk-upload/product-filters",
    sampleType: "product-filters",
  },
  {
    id: "products",
    label: "Products Upload",
    title: "Products Bulk Upload",
    description: "Excel columns: id, item_code, product_type (optional) — saved to sathya_prod",
    api: "/api/product/filter-bulk-upload/products",
    sampleType: "products",
    listApi: "/api/product/filter-bulk-upload/products",
  },
];

export default function FilterBulkUploadPage() {
  const [selectedSection, setSelectedSection] = useState("filter-groups");
  const [excelFile, setExcelFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [prodList, setProdList] = useState([]);
  const [prodTotal, setProdTotal] = useState(0);
  const [prodPage, setProdPage] = useState(1);
  const [prodSearch, setProdSearch] = useState("");
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    import("react-toastify/dist/ReactToastify.css");
  }, []);

  useEffect(() => {
    setExcelFile(null);
    setResult(null);
    setSyncResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedSection]);

  const runSathyaProdSync = async ({ dryRun, confirm = false }) => {
    setIsSyncLoading(true);
    try {
      const res = await fetch("/api/product/filter-bulk-upload/sync-sathya-prod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, confirm }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Sync failed");
        return;
      }

      setSyncResult(data.details || null);

      if (dryRun) {
        toast.info(data.message || "Dry-run complete — check terminal for details");
      } else {
        toast.success(data.message || "Sync applied successfully");
      }
    } catch (error) {
      console.error("sathya_prod sync error:", error);
      toast.error("Sync failed. Check terminal logs.");
    } finally {
      setIsSyncLoading(false);
    }
  };

  const active = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  const fetchProdList = useCallback(async (page = 1, search = "") => {
    if (selectedSection !== "products") return;

    setIsListLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
      });
      const res = await fetch(`/api/product/filter-bulk-upload/products?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProdList(data.data || []);
        setProdTotal(data.pagination?.total || 0);
        setProdPage(data.pagination?.page || 1);
      } else {
        toast.error(data.error || "Failed to load products");
      }
    } catch (error) {
      console.error("Load sathya_prod error:", error);
      toast.error("Failed to load products");
    } finally {
      setIsListLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection === "products") {
      fetchProdList(1, "");
      setProdSearch("");
    }
  }, [selectedSection, fetchProdList]);

  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
  };

  const handleSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/api/product/filter-bulk-upload/sample?type=${active.sampleType}&t=${Date.now()}`;
    link.download = `${active.sampleType}_sample.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFile(excelFile)) {
      toast.error("Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("excel", excelFile);

    try {
      const response = await fetch(active.api, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const failed = data.details?.failed || 0;
        const created = data.details?.created || 0;
        const updated = data.details?.updated || 0;

        if (failed > 0 && created === 0 && updated === 0) {
          toast.error(data.message || "All rows failed");
        } else if (failed > 0) {
          toast.warn(data.message || "Upload completed with some failures");
        } else {
          toast.success(data.message || "Upload completed");
        }

        setResult(data.details || null);
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (selectedSection === "products") {
          fetchProdList(1, prodSearch);
        }
      } else {
        toast.error(data.error || "Upload failed");
        setResult(data.details || null);
      }
    } catch (error) {
      console.error("Filter bulk upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(prodTotal / 20) || 1;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Filter Bulk Upload</h1>
            <p className="text-gray-600">
              Upload filter groups, filters, product filters, and products separately using Excel/CSV
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Upload Type</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-[#d72828]"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8 border border-gray-200"
          >
            <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
              <div className="mb-4">
                <h2 className="text-md font-semibold text-[#d72828] mb-2 border-b pb-2">
                  {active.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{active.description}</p>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel/CSV File
                </h3>
              </div>

              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                  required
                />

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSampleDownload}
                    className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>

                  <a
                    href="/api/product/filter-bulk-upload/export-product-filters"
                    download="sathya_product_filters_export.xlsx"
                    className="inline-flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Product Filters Excel (Temp)
                  </a>
                </div>

                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#b91f1f] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Start Upload"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {result && (
            <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Summary</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">Created: {result.created ?? 0}</div>
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">Updated: {result.updated ?? 0}</div>
                <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">Failed: {result.failed ?? 0}</div>
              </div>
              {Array.isArray(result.detected_headers) && result.detected_headers.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  Detected Excel headers: {result.detected_headers.join(", ")}
                </p>
              )}
              {Array.isArray(result.errors) && result.errors.length > 0 && (
                <div className="mt-4 max-h-48 overflow-auto text-xs text-red-600 space-y-1">
                  {result.errors.slice(0, 20).map((err, idx) => (
                    <div key={idx}>
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  {result.errors.length > 20 && (
                    <div>...and more errors (showing first {Math.min(20, result.errors.length)})</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedSection === "products" && (
          <div className="mt-8 bg-amber-50 border border-amber-300 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Sync sathya_prod → products (IMPORTANT)</h3>
              <p className="text-sm text-amber-800 mt-1">
                Matches by <b>item_code</b>, then writes <b>sathya_old_id</b> (= sathya_prod.id) and
                <b> product_type</b> <u>only when value is normal or gift</u> into the products table.
                Always run <b>Dry Run</b> first. Apply only updates those two fields.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSyncLoading}
                onClick={() => runSathyaProdSync({ dryRun: true })}
                className="px-4 py-2.5 bg-white border border-amber-400 text-amber-900 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50"
              >
                {isSyncLoading ? "Running..." : "1) Dry Run (no DB write)"}
              </button>
              <button
                type="button"
                disabled={isSyncLoading || !syncResult || syncResult.mode !== "dry-run"}
                onClick={() => {
                  const ok = window.confirm(
                    `Apply sync to products?\n\nWould update: ${syncResult?.would_update ?? 0}\nNot found: ${syncResult?.not_found ?? 0}\nConflicts skipped: ${syncResult?.skipped_conflict_existing_sathya_old_id ?? 0}\n\nThis writes sathya_old_id / product_type only.`
                  );
                  if (ok) runSathyaProdSync({ dryRun: false, confirm: true });
                }}
                className="px-4 py-2.5 bg-[#d72828] text-white text-sm font-medium rounded-lg hover:bg-[#b91f1f] disabled:opacity-50"
              >
                2) Apply Sync (writes to products)
              </button>
            </div>

            {syncResult && (
              <div className="bg-white rounded-lg border border-amber-200 p-4 text-sm space-y-4">
                <p className="font-semibold text-gray-900">
                  Last sync mode: {syncResult.mode}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded bg-green-50 px-3 py-2 text-green-700">Would update: {syncResult.would_update ?? 0}</div>
                  <div className="rounded bg-blue-50 px-3 py-2 text-blue-700">Updated: {syncResult.updated ?? 0}</div>
                  <div className="rounded bg-gray-50 px-3 py-2 text-gray-700">Already same: {syncResult.already_same ?? 0}</div>
                  <div className="rounded bg-yellow-50 px-3 py-2 text-yellow-800">Not found: {syncResult.not_found ?? 0}</div>
                  <div className="rounded bg-orange-50 px-3 py-2 text-orange-800">Multi product skip: {syncResult.skipped_multiple_products ?? 0}</div>
                  <div className="rounded bg-red-50 px-3 py-2 text-red-700">Conflict skip: {syncResult.skipped_conflict_existing_sathya_old_id ?? 0}</div>
                  <div className="rounded bg-purple-50 px-3 py-2 text-purple-700">product_type set: {syncResult.product_type_set ?? 0}</div>
                  <div className="rounded bg-slate-50 px-3 py-2 text-slate-700">Duration: {syncResult.duration_seconds ?? 0}s</div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-900">How to read your dry-run</p>
                  <p>✔ <b>{syncResult.would_update ?? 0}</b> item_codes matched exactly 1 product and will get <b>sathya_old_id</b></p>
                  <p>✔ <b>{syncResult.product_type_set ?? 0}</b> of those also get product_type (only normal/gift)</p>
                  <p>⚠ <b>{syncResult.not_found ?? 0}</b> item_codes exist in sathya_prod but NOT in products (will be skipped)</p>
                  <p>ℹ Updated stays 0 on dry-run — that becomes a real number only after Apply</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rows = syncResult.report || [];
                      if (!rows.length) {
                        toast.error("No report rows. Run Dry Run again.");
                        return;
                      }
                      const headers = [
                        "status",
                        "item_code",
                        "sathya_id",
                        "product_id",
                        "product_name",
                        "will_set_sathya_old_id",
                        "will_set_product_type",
                        "note",
                      ];
                      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                      const csv = [
                        headers.join(","),
                        ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `sathya_prod_sync_verify_${Date.now()}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(`Downloaded ${rows.length} verification rows`);
                    }}
                    className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700"
                  >
                    Download Full Match Report (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rows = (syncResult.report || []).filter((r) => r.status === "NOT_FOUND");
                      if (!rows.length) {
                        toast.info("No NOT_FOUND rows");
                        return;
                      }
                      const headers = ["item_code", "sathya_id", "note"];
                      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                      const csv = [
                        headers.join(","),
                        ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `sathya_prod_not_found_${Date.now()}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(`Downloaded ${rows.length} not-found rows`);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
                  >
                    Download Not Found Only (CSV)
                  </button>
                </div>

                {Array.isArray(syncResult.samples?.would_update) && syncResult.samples.would_update.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Sample matched rows (first {syncResult.samples.would_update.length})</h4>
                    <div className="overflow-x-auto max-h-56 border rounded">
                      <table className="min-w-full text-xs">
                        <thead className="bg-green-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">item_code</th>
                            <th className="px-2 py-1 text-left">product_name</th>
                            <th className="px-2 py-1 text-left">sathya_old_id →</th>
                            <th className="px-2 py-1 text-left">product_type →</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syncResult.samples.would_update.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-1">{row.item_code}</td>
                              <td className="px-2 py-1">{row.product_name}</td>
                              <td className="px-2 py-1">{row.set?.sathya_old_id || "(keep existing)"}</td>
                              <td className="px-2 py-1">{row.set?.product_type || "(none)"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {Array.isArray(syncResult.samples?.not_found) && syncResult.samples.not_found.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Sample NOT FOUND in products (first {syncResult.samples.not_found.length})</h4>
                    <div className="overflow-x-auto max-h-56 border rounded">
                      <table className="min-w-full text-xs">
                        <thead className="bg-yellow-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">item_code</th>
                            <th className="px-2 py-1 text-left">sathya_id</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syncResult.samples.not_found.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-1">{row.item_code}</td>
                              <td className="px-2 py-1">{row.sathya_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedSection === "products" && (
          <div className="mt-8 bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">sathya_prod Data</h3>
                <p className="text-sm text-gray-500">Total records: {prodTotal}</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchProdList(1, prodSearch);
                  }}
                  placeholder="Search id / item_code / product_type"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => fetchProdList(1, prodSearch)}
                  className="px-4 py-2 bg-[#d72828] text-white text-sm rounded-lg hover:bg-[#b91f1f]"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2 border-b">id</th>
                    <th className="px-3 py-2 border-b">item_code</th>
                    <th className="px-3 py-2 border-b">product_type</th>
                  </tr>
                </thead>
                <tbody>
                  {isListLoading ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : prodList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                        No products found in sathya_prod
                      </td>
                    </tr>
                  ) : (
                    prodList.map((item) => (
                      <tr key={item._id || item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.id}</td>
                        <td className="px-3 py-2">{item.item_code}</td>
                        <td className="px-3 py-2">{item.product_type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {prodTotal > 20 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Page {prodPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={prodPage <= 1 || isListLoading}
                    onClick={() => fetchProdList(prodPage - 1, prodSearch)}
                    className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={prodPage >= totalPages || isListLoading}
                    onClick={() => fetchProdList(prodPage + 1, prodSearch)}
                    className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
}
