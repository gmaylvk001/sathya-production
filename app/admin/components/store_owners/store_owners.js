import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

const PAYMENT_GATEWAYS = ["payu", "razorpay", "pinelabs", "ccavenue", "cod"];

const STORE_NAMES = ["sathya", "unilet"];

const EMPTY_FORM = {
  name: "",
  store_name: "unilet",
  email: "",
  payment_gateway: "",
  state_name: "",
  is_active: 1,
  price_on: 0,
  stock_on: 0,
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function FlagBadge({ value, onLabel = "On", offLabel = "Off" }) {
  return Number(value) === 1 ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{onLabel}</span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{offLabel}</span>
  );
}

export default function StoreOwnersComponent() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    fetchRows();
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "unilet") {
      openAdd();
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const flash = (message) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(""), 3000);
  };

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/store_owners/get");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching store owners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setIsEditMode(false);
    setCurrentId(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setFormData({
      name: row.name || "",
      store_name: row.store_name || "",
      email: row.email || "",
      payment_gateway: row.payment_gateway || "",
      state_name: row.state_name || "",
      is_active: Number(row.is_active) === 1 ? 1 : 0,
      price_on: Number(row.price_on) === 1 ? 1 : 0,
      stock_on: Number(row.stock_on) === 1 ? 1 : 0,
    });
    setIsEditMode(true);
    setCurrentId(row._id);
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSaving(true);
    try {
      if (isEditMode) {
        await axios.put("/api/store_owners/edit", { storeOwnerId: currentId, ...formData });
        flash("✅ Store owner updated successfully!");
      } else {
        await axios.post("/api/store_owners/add", formData);
        flash("✅ Store owner added successfully!");
      }
      setIsModalOpen(false);
      fetchRows();
    } catch (error) {
      setFormError(error.response?.data?.error || "Error saving store owner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete store owner "${row.name}" (${row.store_name})?`)) return;
    try {
      await axios.delete("/api/store_owners/delete", { data: { storeOwnerId: row._id } });
      flash("✅ Store owner deleted successfully!");
      fetchRows();
    } catch (error) {
      flash(error.response?.data?.error || "❌ Error deleting store owner");
    }
  };

  const filtered = rows.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [row.name, row.store_name, row.payment_gateway, row.state_name]
        .some((value) => value && String(value).toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "" || String(Number(row.is_active) === 1 ? 1 : 0) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Store Owners</h2>
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
                placeholder="Name, store, gateway, state..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                onClick={openAdd}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
              >
                + Add Store Owner
              </button>
            </div>
          </div>

          {alertMessage && !isModalOpen && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
          )}

          <hr className="border-t border-gray-200 mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Name</th>
                  <th className="p-2">Store Name</th>
                  <th className="p-2">Payment Gateway</th>
                  <th className="p-2">State Name</th>
                  <th className="p-2">Active</th>
                  {/* <th className="p-2">Price On</th>
                  <th className="p-2">Stock On</th> */}
                  <th className="p-2">Created At</th>
                  <th className="p-2">Updated At</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((row) => (
                    <tr key={row._id} className="text-center border-b">
                      <td className="p-2 font-bold">{row.name || "-"}</td>
                      <td className="p-2">{row.store_name || "-"}</td>
                      <td className="p-2">{row.payment_gateway || "-"}</td>
                      <td className="p-2">{row.state_name || "-"}</td>
                      <td className="p-2"><FlagBadge value={row.is_active} onLabel="Active" offLabel="Inactive" /></td>
                      {/* <td className="p-2"><FlagBadge value={row.price_on} /></td>
                      <td className="p-2"><FlagBadge value={row.stock_on} /></td> */}
                      <td className="p-2 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                      <td className="p-2 whitespace-nowrap">{formatDateTime(row.updated_at)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => openEdit(row)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
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
                    <td colSpan="8" className="p-2 text-center text-gray-500">No store owners found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfFirstItem + itemsPerPage, filtered.length)} of {filtered.length} entries
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  «
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 border rounded-md ${currentPage === i + 1 ? "bg-red-500 text-white" : "bg-white"}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[30rem] max-w-[95vw] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">{isEditMode ? "Edit Store Owner" : "Add Store Owner"}</h2>
            <button onClick={closeModal} className="absolute top-3 right-3 text-red-500 text-xl" aria-label="Close">×</button>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} maxLength={255} className="w-full border p-2 rounded" placeholder="Unilet" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                <select name="store_name" value={formData.store_name} onChange={handleChange} className="w-full border p-2 rounded" required>
                  {STORE_NAMES.map((storeName) => (
                    <option key={storeName} value={storeName}>{storeName}</option>
                  ))}
                  {formData.store_name && !STORE_NAMES.includes(formData.store_name) && (
                    <option value={formData.store_name}>{formData.store_name}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} maxLength={255} className="w-full border p-2 rounded" placeholder="name@example.com (optional)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Gateway</label>
                  <input type="text" name="payment_gateway" value={formData.payment_gateway} onChange={handleChange} maxLength={100} list="store-owner-gateways" className="w-full border p-2 rounded" placeholder="payu" />
                  <datalist id="store-owner-gateways">
                    {PAYMENT_GATEWAYS.map((gateway) => <option key={gateway} value={gateway} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
                  <input type="text" name="state_name" value={formData.state_name} onChange={handleChange} maxLength={100} list="store-owner-states" className="w-full border p-2 rounded" placeholder="Tamil Nadu" />
                  <datalist id="store-owner-states">
                    {INDIAN_STATES.map((state) => <option key={state} value={state} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex flex-wrap gap-5 pt-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" checked={formData.is_active === 1} onChange={handleChange} />
                  Active
                </label>
                {/* Price On / Stock On hidden for now; new store owners are saved with both off.
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="price_on" checked={formData.price_on === 1} onChange={handleChange} />
                  Price On
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="stock_on" checked={formData.stock_on === 1} onChange={handleChange} />
                  Stock On
                </label>
                */}
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">{formError}</div>
              )}

              <button type="submit" disabled={isSaving} className="bg-red-500 text-white px-4 py-2 rounded w-full disabled:opacity-50">
                {isSaving ? "Saving..." : isEditMode ? "Update Store Owner" : "Add Store Owner"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
