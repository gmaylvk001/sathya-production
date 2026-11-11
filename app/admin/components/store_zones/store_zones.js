"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

const EMPTY_FORM = {
  exist_id: "",
  zonename: "",
  slug: "",
  status: 1,
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function StoreZonesComponent() {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  useEffect(() => {
    fetchRows();
  }, []);

  const showMsg = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3500);
  };

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/store_zones/get");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching store zones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      exist_id: row.exist_id || "",
      zonename: row.zonename || "",
      slug: row.slug || "",
      status: row.status ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!String(form.slug || "").trim() && !String(form.zonename || "").trim()) {
      showMsg("❌ Zone name or slug is required");
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await axios.put("/api/store_zones/edit", { id: editingId, ...form });
        showMsg("✅ Zone updated");
      } else {
        await axios.post("/api/store_zones/add", form);
        showMsg("✅ Zone added");
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
    if (!window.confirm("Delete this zone?")) return;
    try {
      await axios.delete("/api/store_zones/delete", { data: { id } });
      setSelectedIds((prev) => prev.filter((item) => item !== String(id)));
      showMsg("✅ Zone deleted");
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
      const response = await axios.post("/api/store_zones/import", data, { timeout: 300000 });
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
      [row.exist_id, row.zonename, row.slug].some((v) => v && String(v).toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "" || String(row.status ?? "") === statusFilter;
    return matchesSearch && matchesStatus;
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
    if (!window.confirm(`Delete ${selectedIds.length} selected zone(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/store_zones/delete", { data: { ids: selectedIds } });
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
    if (!window.confirm(`Delete ALL ${rows.length} zones?`)) return;
    const typed = window.prompt('Type DELETE ALL to confirm:');
    if (typed !== "DELETE ALL") {
      showMsg("❌ Full delete cancelled");
      return;
    }
    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/store_zones/delete", { data: { deleteAll: true } });
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
        <h2 className="text-2xl font-bold">Store Zones</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Exist id, zone name, slug..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All</option>
                <option value="1">Active (1)</option>
                <option value="0">Inactive (0)</option>
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={openAdd}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
              >
                Add Zone
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

          <table className="w-full border border-gray-300 min-w-[800px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 w-10">
                  <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                </th>
                <th className="p-2">Exist ID</th>
                <th className="p-2">Zone Name</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created At</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((row) => (
                  <tr key={row._id} className="text-center border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(row._id))}
                        onChange={() => toggleSelect(row._id)}
                      />
                    </td>
                    <td className="p-2">{row.exist_id || "-"}</td>
                    <td className="p-2 font-semibold">{row.zonename || "-"}</td>
                    <td className="p-2">{row.slug || "-"}</td>
                    <td className="p-2">{row.status ?? 0}</td>
                    <td className="p-2">{formatDateTime(row.created_at)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => openEdit(row)}
                          className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full inline-flex items-center justify-center"
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
                  <td colSpan="7" className="p-2 text-center text-gray-500">No zones found.</td>
                </tr>
              )}
            </tbody>
          </table>

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
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Zone" : "Add Zone"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            {showAlert && <div className="bg-green-500 text-white px-3 py-2 rounded mb-3 text-center text-sm">{alertMessage}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Exist ID</label>
                <input
                  className="w-full border rounded p-2"
                  value={form.exist_id}
                  onChange={(e) => setForm((f) => ({ ...f, exist_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Zone Name</label>
                <input
                  className="w-full border rounded p-2"
                  value={form.zonename}
                  onChange={(e) => setForm((f) => ({ ...f, zonename: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Slug</label>
                <input
                  className="w-full border rounded p-2"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
                >
                  <option value={1}>Active (1)</option>
                  <option value={0}>Inactive (0)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Import Exist Zones</h3>
              <button type="button" onClick={() => setIsImportOpen(false)}>✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Existing <code>exist_id</code> / <code>id</code> rows are skipped. Download sample first if needed.
            </p>
            <a
              href="/api/store_zones/import/sample"
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
