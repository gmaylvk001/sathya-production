"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

const EMPTY_FORM = {
  exist_id: "",
  branch_code: "",
  categories: "",
  user_id: "",
  title: "",
  slug: "",
  description: "",
  approved: 1,
  verified: 0,
  spam: 0,
  phone: "",
  phone_afterhours: "",
  website: "",
  email: "",
  address: "",
  latitude: "",
  longitude: "",
  zipcode: "",
  zone_code: "",
  is_WH: 0,
  store_owner: "sathya",
  meta_title: "",
  meta_description: "",
  tags: "",
  service_area: "",
};

const FIELD_LABELS = [
  ["exist_id", "Exist ID"],
  ["branch_code", "Branch Code"],
  ["categories", "Categories"],
  ["user_id", "User ID"],
  ["title", "Title"],
  ["slug", "Slug"],
  ["description", "Description"],
  ["approved", "Approved"],
  ["verified", "Verified"],
  ["spam", "Spam"],
  ["phone", "Phone"],
  ["phone_afterhours", "Phone After Hours"],
  ["website", "Website"],
  ["email", "Email"],
  ["address", "Address"],
  ["latitude", "Latitude"],
  ["longitude", "Longitude"],
  ["zipcode", "Zipcode"],
  ["zone_code", "Zone Code"],
  ["is_WH", "Is WH"],
  ["store_owner", "Store Owner"],
  ["meta_title", "Meta Title"],
  ["meta_description", "Meta Description"],
  ["tags", "Tags"],
  ["service_area", "Service Area"],
  ["logo", "Logo"],
  ["image1", "Image1"],
  ["image2", "Image2"],
  ["image3", "Image3"],
  ["images", "Images"],
  ["facebook", "Facebook"],
  ["twitter", "Twitter"],
  ["map_data", "Map Data"],
  ["location_insights_id", "Location Insights ID"],
  ["instagram_stories", "Instagram Stories"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function StoreListingsComponent() {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [approvedFilter, setApprovedFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [uniletView, setUniletView] = useState(false);
  const [editOriginal, setEditOriginal] = useState(null);
  const [branchError, setBranchError] = useState("");
  const [branchChecking, setBranchChecking] = useState(false);

  useEffect(() => {
    setUniletView(/(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie));
    fetchRows();
    fetchZones();
  }, []);

  useEffect(() => {
    setBranchError("");
    if (!isModalOpen) return;
    const code = String(form.branch_code || "").trim();
    const owner = uniletView ? "unilet" : form.store_owner || "sathya";
    if (!code) return;
    if (
      editOriginal &&
      code.toLowerCase() === String(editOriginal.branch_code || "").trim().toLowerCase() &&
      owner === editOriginal.store_owner
    ) {
      return;
    }
    let cancelled = false;
    setBranchChecking(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ branch_code: code, store_owner: owner });
        if (editingId) params.set("id", String(editingId));
        const response = await axios.get(`/api/store_listings/check-branch?${params.toString()}`);
        if (!cancelled) setBranchError(response.data?.exists ? response.data.message : "");
      } catch (error) {
        console.error("Error checking branch code:", error);
      } finally {
        if (!cancelled) setBranchChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setBranchChecking(false);
    };
  }, [form.branch_code, form.store_owner, isModalOpen, editingId, editOriginal, uniletView]);

  const showMsg = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3500);
  };

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/store_listings/get?scope=admin", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching store listings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get("/api/store_zones/get");
      setZones(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  };

  const zoneLabel = (zoneCode) => {
    if (zoneCode == null || zoneCode === "") return "-";
    const match = zones.find(
      (z) => String(z.exist_id || "") === String(zoneCode) || String(z._id) === String(zoneCode)
    );
    return match ? `${match.zonename || match.slug} (${zoneCode})` : String(zoneCode);
  };

  const zoneName = (zoneCode) => {
    if (zoneCode == null || zoneCode === "") return "-";
    const match = zones.find(
      (z) => String(z.exist_id || "") === String(zoneCode) || String(z._id) === String(zoneCode)
    );
    return match ? match.zonename || match.slug : String(zoneCode);
  };

  const openAdd = () => {
    setEditingId(null);
    setEditOriginal(null);
    setForm(uniletView ? { ...EMPTY_FORM, store_owner: "unilet" } : EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setEditOriginal({
      branch_code: row.branch_code || "",
      store_owner: String(row.store_owner || "").toLowerCase() === "unilet" ? "unilet" : "sathya",
    });
    setForm({
      exist_id: row.exist_id || "",
      branch_code: row.branch_code || "",
      categories: row.categories || "",
      user_id: row.user_id ?? "",
      title: row.title || "",
      slug: row.slug || "",
      description: row.description || "",
      approved: row.approved ?? 0,
      verified: row.verified ?? 0,
      spam: row.spam ?? 0,
      phone: row.phone || "",
      phone_afterhours: row.phone_afterhours || "",
      website: row.website || "",
      email: row.email || "",
      address: row.address || "",
      latitude: row.latitude || "",
      longitude: row.longitude || "",
      zipcode: row.zipcode ?? "",
      zone_code: row.zone_code ?? "",
      is_WH: row.is_WH ?? 0,
      store_owner: uniletView ? "unilet" : row.store_owner || "sathya",
      meta_title: row.meta_title || "",
      meta_description: row.meta_description || "",
      tags: row.tags || "",
      service_area: row.service_area || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (branchError || branchChecking) return;
    setIsSaving(true);
    const payload = uniletView ? { ...form, store_owner: "unilet" } : form;
    try {
      if (editingId) {
        await axios.put("/api/store_listings/edit", { id: editingId, ...payload });
        showMsg("✅ Listing updated");
      } else {
        await axios.post("/api/store_listings/add", payload);
        showMsg("✅ Listing added");
      }
      setIsModalOpen(false);
      fetchRows();
    } catch (error) {
      showMsg(error.response?.data?.error || "❌ Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this store listing?")) return;
    try {
      await axios.delete("/api/store_listings/delete", { data: { id } });
      setSelectedIds((prev) => prev.filter((item) => item !== String(id)));
      showMsg("✅ Listing deleted");
      fetchRows();
    } catch (error) {
      showMsg(error.response?.data?.error || "❌ Delete failed");
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showMsg("❌ Please choose an Excel, CSV or JSON file");
      return;
    }
    const name = importFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv") && !name.endsWith(".json")) {
      showMsg("❌ Only .xlsx, .csv and .json files are allowed");
      return;
    }
    const data = new FormData();
    data.append("excel", importFile);
    setIsImporting(true);
    setImportResult(null);
    try {
      const response = await axios.post("/api/store_listings/import", data, { timeout: 300000 });
      setImportResult(response.data);
      showMsg(response.data.message || "✅ Import completed");
      setImportFile(null);
      fetchRows();
    } catch (error) {
      showMsg(error.response?.data?.error || "❌ Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredRows = rows.filter((row) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      [row.exist_id, row.branch_code, row.title, row.slug, row.phone, row.email, row.city, row.address, row.zipcode]
        .some((v) => v != null && String(v).toLowerCase().includes(q));
    const matchesApproved =
      approvedFilter === "" || String(row.approved ?? "") === approvedFilter;
    return matchesSearch && matchesApproved;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstItem, indexOfLastItem);
  const currentPageIds = currentRows.map((row) => String(row._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  const toggleSelect = (id) => {
    const key = String(id);
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const toggleSelectCurrentPage = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected listing(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/store_listings/delete", { data: { ids: selectedIds } });
      showMsg(`✅ ${response.data.message || "Deleted"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMsg(error.response?.data?.error || "❌ Delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!rows.length) return;
    if (!window.confirm(`Delete ALL ${rows.length} store listings?`)) return;
    const typed = window.prompt("Type DELETE ALL to confirm:");
    if (typed !== "DELETE ALL") {
      showMsg("❌ Full delete cancelled");
      return;
    }
    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/store_listings/delete", { data: { deleteAll: true } });
      showMsg(`✅ ${response.data.message || "All deleted"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMsg(error.response?.data?.error || "❌ Delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Store Listings</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Branch, title, phone, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approved</label>
              <select
                value={approvedFilter}
                onChange={(e) => {
                  setApprovedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All</option>
                <option value="1">Yes (1)</option>
                <option value="0">No (0)</option>
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={openAdd} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-md">
                Add Listing
              </button>
              <button
                onClick={() => {
                  setImportResult(null);
                  setImportFile(null);
                  setIsImportOpen(true);
                }}
                className="p-2 border border-red-500 text-red-500 hover:bg-red-50 rounded-md"
              >
                Import Excel/CSV/JSON
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isBulkDeleting || rows.length === 0}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                Delete all ({rows.length})
              </button>
            </div>
          </div>

          {showAlert && !isImportOpen && !isModalOpen && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
          )}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-gray-700">{selectedIds.length} selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                Delete selected
              </button>
              <button type="button" onClick={() => setSelectedIds([])} className="p-2 border border-gray-300 rounded-md text-sm">
                Clear
              </button>
            </div>
          )}

          <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-1.5 py-2 w-8">
                  <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                </th>
                <th className="px-1.5 py-2 font-semibold">Exist ID</th>
                <th className="px-1.5 py-2 font-semibold">Branch</th>
                <th className="px-1.5 py-2 font-semibold text-left">Title</th>
                <th className="px-1.5 py-2 font-semibold">Phone</th>
                <th className="px-1.5 py-2 font-semibold">Zone</th>
                <th className="px-1.5 py-2 font-semibold">Approved</th>
                <th className="px-1.5 py-2 font-semibold">Created At</th>
                <th className="px-1.5 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((row) => (
                  <tr key={row._id} className="text-center border-b hover:bg-gray-50">
                    <td className="px-1.5 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(row._id))}
                        onChange={() => toggleSelect(row._id)}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">{row.exist_id || "-"}</td>
                    <td className="px-1.5 py-1.5 font-semibold">{row.branch_code || "-"}</td>
                    <td className="px-1.5 py-1.5 text-left">{row.title || "-"}</td>
                    <td className="px-1.5 py-1.5 whitespace-nowrap">{row.phone || "-"}</td>
                    <td className="px-1.5 py-1.5">{zoneName(row.zone_code)}</td>
                    <td className="px-1.5 py-1.5">{row.approved ?? 0}</td>
                    <td className="px-1.5 py-1.5">{formatDateTime(row.created_at)}</td>
                    <td className="px-1.5 py-1.5">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => setViewRow(row)}
                          className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full inline-flex items-center justify-center"
                          title="View"
                        >
                          <Icon icon="mingcute:eye-line" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="w-7 h-7 bg-green-100 text-green-700 rounded-full inline-flex items-center justify-center"
                          title="Edit"
                        >
                          <Icon icon="mingcute:edit-line" />
                        </button>
                        <button
                          onClick={() => handleDelete(row._id)}
                          className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center"
                          title="Delete"
                        >
                          <Icon icon="mingcute:delete-2-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-2 text-center text-gray-500">No store listings found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRows.length)} of {filteredRows.length}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-sm">{currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Store Listing" : "Add Store Listing"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            {showAlert && <div className="bg-green-500 text-white px-3 py-2 rounded mb-3 text-center text-sm">{alertMessage}</div>}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["exist_id", "Exist ID (optional)"],
                ["branch_code", "Branch Code"],
                ["title", "Title"],
                ["slug", "Slug"],
                ["phone", "Phone"],
                ["phone_afterhours", "Phone After Hours"],
                ["email", "Email"],
                ["website", "Website"],
                ["address", "Address"],
                ["latitude", "Latitude"],
                ["longitude", "Longitude"],
                ["zipcode", "Zipcode"],
                ["categories", "Categories"],
                ["user_id", "User ID"],
                ["tags", "Tags"],
                ["service_area", "Service Area"],
                ["meta_title", "Meta Title"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm mb-1">{label}</label>
                  <input
                    className={`w-full border rounded p-2 ${key === "branch_code" && branchError ? "border-red-500" : ""}`}
                    value={form[key] ?? ""}
                    maxLength={key === "branch_code" ? 5 : undefined}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                  {key === "branch_code" && branchError && (
                    <p className="mt-1 text-xs text-red-600">{branchError}</p>
                  )}
                  {key === "branch_code" && !branchError && branchChecking && (
                    <p className="mt-1 text-xs text-gray-500">Checking branch code...</p>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm mb-1">Zone Code</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.zone_code}
                  onChange={(e) => setForm((f) => ({ ...f, zone_code: e.target.value }))}
                >
                  <option value="">Choose zone</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z.exist_id || ""}>
                      {z.zonename || z.slug} {z.exist_id ? `(${z.exist_id})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {!uniletView && (
                <div>
                  <label className="block text-sm mb-1">Store Owner</label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.store_owner}
                    onChange={(e) => setForm((f) => ({ ...f, store_owner: e.target.value }))}
                  >
                    <option value="sathya">sathya</option>
                    <option value="unilet">unilet</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm mb-1">Approved</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.approved}
                  onChange={(e) => setForm((f) => ({ ...f, approved: Number(e.target.value) }))}
                >
                  <option value={1}>Yes (1)</option>
                  <option value={0}>No (0)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Verified</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.verified}
                  onChange={(e) => setForm((f) => ({ ...f, verified: Number(e.target.value) }))}
                >
                  <option value={1}>Yes (1)</option>
                  <option value={0}>No (0)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Is WH</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.is_WH}
                  onChange={(e) => setForm((f) => ({ ...f, is_WH: Number(e.target.value) }))}
                >
                  <option value={0}>No (0)</option>
                  <option value={1}>Yes (1)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Meta Description</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={2}
                  value={form.meta_description}
                  onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button
                  type="submit"
                  disabled={isSaving || Boolean(branchError) || branchChecking}
                  className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewRow && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Listing Details</h3>
              <button type="button" onClick={() => setViewRow(null)}>✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {FIELD_LABELS.map(([key, label]) => (
                <div key={key} className="border-b pb-2">
                  <div className="text-gray-500">{label}</div>
                  <div className="font-medium break-words">
                    {key === "zone_code" ? zoneLabel(viewRow.zone_code) : formatValue(viewRow[key])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Import Exist Stores</h3>
              <button type="button" onClick={() => setIsImportOpen(false)}>✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Existing <code>exist_id</code> / <code>id</code> rows are skipped. Download sample first if needed.
            </p>
            <a
              href="/api/store_listings/import/sample"
              className="inline-block mb-3 text-sm text-red-600 hover:underline"
            >
              Download sample Excel
            </a>
            <form onSubmit={handleImportSubmit} className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.csv,.json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              {importResult && (
                <div className="text-sm bg-gray-50 border rounded p-3">
                  <div>{importResult.message}</div>
                  {importResult.skippedExistingCount > 0 && (
                    <div className="mt-1 text-orange-700">Skipped existing: {importResult.skippedExistingCount}</div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsImportOpen(false)} className="px-4 py-2 border rounded">Close</button>
                <button type="submit" disabled={isImporting} className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50">
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
