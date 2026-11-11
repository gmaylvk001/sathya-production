"use client";

import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { Icon } from "@iconify/react";

function generateSlug(name = "") {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function FinanceBankTable() {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("list"); // 'list' | 'create' | 'edit'

  const [formData, setFormData] = useState({
    _id: null,
    id: "",
    name: "",
    slug: "",
    useSlugForUrl: false,
    slugTouched: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const fetchBanks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/emi-finance");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBanks(data.data);
      }
    } catch (err) {
      console.error("Error fetching finance banks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleOpenCreate = () => {
    // Next auto ID estimate
    const nextId = banks.length > 0 ? Math.max(...banks.map((b) => b.id || 0)) + 1 : 1;
    setFormData({
      _id: null,
      id: nextId,
      name: "",
      slug: "",
      useSlugForUrl: false,
      slugTouched: false,
    });
    setView("create");
  };

  const handleOpenEdit = (item) => {
    setFormData({
      _id: item._id,
      id: item.id,
      name: item.name || "",
      slug: item.slug || generateSlug(item.name || ""),
      useSlugForUrl: Boolean(item.useSlugForUrl),
      slugTouched: true,
    });
    setView("edit");
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: newName,
      slug: prev.slugTouched ? prev.slug : generateSlug(newName),
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/emi-finance/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug?.trim() || generateSlug(formData.name),
          useSlugForUrl: formData.useSlugForUrl,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("EMI Finance Created Successfully");
        await fetchBanks();
        setView("list");
      } else {
        alert(result.error || "Failed to create finance bank");
      }
    } catch (error) {
      console.error("Error creating finance bank:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/emi-finance/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: formData._id,
          id: formData.id,
          name: formData.name.trim(),
          slug: formData.slug?.trim() || generateSlug(formData.name),
          useSlugForUrl: formData.useSlugForUrl,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("EMI Finance Updated Successfully");
        await fetchBanks();
        setView("list");
      } else {
        alert(result.error || "Failed to update finance bank");
      }
    } catch (error) {
      console.error("Error updating finance bank:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch("/api/emi-finance/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToDelete.id, _id: itemToDelete._id }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("EMI Finance Deleted Successfully");
        setShowDeleteModal(false);
        setItemToDelete(null);
        if (view === "edit") {
          setView("list");
        }
        await fetchBanks();
      } else {
        alert(result.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting finance bank:", err);
    }
  };

  const filteredBanks = banks.filter((b) =>
    (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(b.id || "").includes(searchQuery) ||
    (b.slug || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-white min-h-[500px]">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-4 py-2.5 rounded shadow-lg text-sm flex items-center gap-2 transition-all">
          <span>✔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800">{itemToDelete?.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 bg-[#d9534f] text-white rounded text-sm hover:bg-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: LIST VIEW (Matches Screenshot 1) */}
      {view === "list" && (
        <div>
          <h2 className="text-3xl font-light text-gray-700 mb-6">EMI Finance</h2>

          {/* Search bar & + New Finance button */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 px-3 py-1.5 rounded w-72 focus:outline-none focus:border-blue-400 text-sm"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-base pointer-events-none">
                <Icon icon="ic:baseline-search" />
              </span>
            </div>

            <button
              onClick={handleOpenCreate}
              className="border border-gray-300 px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium shadow-sm transition"
            >
              <span className="text-base font-bold leading-none">+</span> New Finance
            </button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading EMI Finance...</div>
          ) : (
            <div className="overflow-x-auto border-t border-gray-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm w-20">
                      ID
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                      Finance Name
                    </th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-700 text-sm pr-6 w-56"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBanks.length > 0 ? (
                    filteredBanks.map((item) => (
                      <tr key={item._id || item.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 text-sm text-gray-700 font-normal">
                          {item.id}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal text-gray-800 uppercase tracking-wide">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 text-sm transition"
                            >
                              <FaEdit className="w-3.5 h-3.5 text-gray-600" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="px-2.5 py-1 border border-[#d9534f] rounded bg-[#d9534f] text-white hover:bg-red-600 flex items-center gap-1.5 text-sm transition"
                            >
                              <Icon icon="mingcute:delete-2-line" className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-gray-500 text-sm">
                        No finance banks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CREATE VIEW (Matches Screenshot 2) */}
      {view === "create" && (
        <div className="max-w-4xl">
          <h2 className="text-3xl font-light text-gray-700 mb-6">Create EMI Finance</h2>
          <div className="border-b border-gray-200 mb-8"></div>

          <form onSubmit={handleCreateSubmit}>
            {/* Name */}
            <div className="flex items-center mb-6">
              <label className="w-36 text-gray-700 font-semibold text-sm">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder=""
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-xl focus:outline-none focus:border-blue-400 text-sm"
                required
                autoFocus
              />
            </div>

            {/* Slug Name (auto-generated, optional in schema) */}
            <div className="flex items-center mb-6">
              <label className="w-36 text-gray-700 font-semibold text-sm">Slug Name</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slug: e.target.value,
                    slugTouched: true,
                  }))
                }
                placeholder="Auto-generated from name"
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-xl focus:outline-none focus:border-blue-400 text-sm bg-gray-50 text-gray-700"
              />
            </div>

            {/* Slug Option for URL */}
            <div className="flex items-start mb-8">
              <div className="w-36"></div>
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="checkbox"
                  id="useSlugForUrlCreate"
                  checked={formData.useSlugForUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      useSlugForUrl: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                />
                <label
                  htmlFor="useSlugForUrlCreate"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Make slug as URL identifier{" "}
                  <span className="text-gray-500 text-xs">
                    (If unchecked, numeric ID will work as the URL slug)
                  </span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 max-w-xl ml-36">
              <button
                type="button"
                onClick={() => setView("list")}
                className="border border-gray-300 px-5 py-2 rounded text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#48bb78] text-white px-6 py-2 rounded hover:bg-green-600 text-sm font-medium transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: EDIT VIEW (Matches Screenshot 3) */}
      {view === "edit" && (
        <div className="max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-light text-gray-700">Edit EMI Finance</h2>
            <button
              type="button"
              onClick={() => handleDeleteClick(formData)}
              className="bg-[#d9534f] text-white px-3.5 py-1.5 rounded hover:bg-red-600 flex items-center gap-1.5 text-sm font-medium transition"
            >
              <Icon icon="mingcute:delete-2-line" className="w-4 h-4" /> Delete
            </button>
          </div>
          <div className="border-b border-gray-200 mb-8"></div>

          <form onSubmit={handleUpdateSubmit}>
            {/* Read-only ID */}
            <div className="flex items-center mb-6">
              <label className="w-36 text-gray-700 font-semibold text-sm">ID</label>
              <input
                type="text"
                value={formData.id}
                disabled
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-xl bg-[#eeeeee] text-gray-700 cursor-not-allowed text-sm"
              />
            </div>

            {/* Name */}
            <div className="flex items-center mb-6">
              <label className="w-36 text-gray-700 font-semibold text-sm">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-xl focus:outline-none focus:border-blue-400 text-sm"
                required
              />
            </div>

            {/* Slug Name */}
            <div className="flex items-center mb-6">
              <label className="w-36 text-gray-700 font-semibold text-sm">Slug Name</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slug: e.target.value,
                  }))
                }
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-xl focus:outline-none focus:border-blue-400 text-sm"
              />
            </div>

            {/* Slug Option for URL */}
            <div className="flex items-start mb-8">
              <div className="w-36"></div>
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="checkbox"
                  id="useSlugForUrlEdit"
                  checked={formData.useSlugForUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      useSlugForUrl: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                />
                <label
                  htmlFor="useSlugForUrlEdit"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Make slug as URL identifier{" "}
                  <span className="text-gray-500 text-xs">
                    (If unchecked, numeric ID "{formData.id}" works as the URL slug)
                  </span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 max-w-xl ml-36">
              <button
                type="button"
                onClick={() => setView("list")}
                className="border border-gray-300 px-5 py-2 rounded text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#48bb78] text-white px-6 py-2 rounded hover:bg-green-600 text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span className="text-base font-bold leading-none">✔</span>{" "}
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
