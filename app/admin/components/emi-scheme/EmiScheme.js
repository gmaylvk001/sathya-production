"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import ReactPaginate from "react-paginate";

export default function EmiScheme() {
  const [schemes, setSchemes] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("list"); // 'list' | 'create' | 'edit'

  const [formData, setFormData] = useState({
    _id: null,
    id: "",
    schemeCode: "",
    emiFinanceName: "",
    tenure: "",
    advanceEmi: "",
    dbd: "",
    pf: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [actionToDelete, setActionToDelete] = useState(null); // { type: 'single' | 'all', id?: string }
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const fetchSchemes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/emi-scheme");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSchemes(data.data);
      }
    } catch (err) {
      console.error("Error fetching schemes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch("/api/emi-scheme/available-codes");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableProducts(data.data);
      }
    } catch (err) {
      console.error("Error fetching available products:", err);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleOpenCreate = async () => {
    await fetchAvailableProducts();
    const nextId = schemes.length > 0 ? Math.max(...schemes.map((s) => s.id || 0)) + 1 : 1;
    setFormData({
      _id: null,
      id: nextId,
      schemeCode: "",
      emiFinanceName: "",
      tenure: "",
      advanceEmi: "",
      dbd: "",
      pf: "",
    });
    setView("create");
  };

  const handleOpenEdit = (item) => {
    setFormData({
      _id: item._id,
      id: item.id,
      schemeCode: item.schemeCode || "",
      emiFinanceName: item.emiFinanceName || "",
      tenure: item.tenure || "",
      advanceEmi: item.advanceEmi || "",
      dbd: item.dbd || "",
      pf: item.pf || "",
    });
    setView("edit");
  };

  const handleSchemeCodeChange = (e) => {
    const selectedCode = e.target.value;
    const selectedProduct = availableProducts.find((p) => p.schemeCode === selectedCode);
    
    setFormData((prev) => ({
      ...prev,
      schemeCode: selectedCode,
      emiFinanceName: selectedProduct ? selectedProduct.emiFinanceName : "",
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schemeCode.trim()) {
      alert("Scheme Code is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/emi-scheme/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeCode: formData.schemeCode,
          emiFinanceName: formData.emiFinanceName,
          tenure: formData.tenure,
          advanceEmi: formData.advanceEmi,
          dbd: formData.dbd,
          pf: formData.pf,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        await fetchSchemes();
        setView("list");
        setSuccessMessage("EMI Scheme Created Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to create EMI Scheme");
      }
    } catch (error) {
      console.error("Error creating EMI Scheme:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schemeCode.trim()) {
      alert("Scheme Code is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/emi-scheme/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        await fetchSchemes();
        setView("list");
        setSuccessMessage("EMI Scheme Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to update EMI Scheme");
      }
    } catch (error) {
      console.error("Error updating EMI Scheme:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!actionToDelete) return;
    try {
      if (actionToDelete.type === 'single') {
        const res = await fetch("/api/emi-scheme/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: actionToDelete.id }),
        });
        const result = await res.json();
        if (res.ok && result.success) {
          if (view === "edit") setView("list");
          setSuccessMessage("EMI Scheme Deleted Successfully");
          setShowSuccessModal(true);
          fetchSchemes();
        } else {
          alert(result.error || "Failed to delete");
        }
      } else if (actionToDelete.type === 'all') {
        const res = await fetch("/api/emi-scheme/delete-all", {
          method: "POST",
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setSuccessMessage("All EMI Schemes Deleted Successfully");
          setShowSuccessModal(true);
          fetchSchemes();
        } else {
          alert(result.error || "Failed to delete all");
        }
      }
    } catch (err) {
      console.error("Error deleting:", err);
    } finally {
      setShowConfirmationModal(false);
      setActionToDelete(null);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  const filteredSchemes = schemes.filter((s) =>
    (s.schemeCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.id || "").includes(searchQuery)
  );

  const pageCount = Math.ceil(filteredSchemes.length / itemsPerPage);
  const totalEntries = filteredSchemes.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">
          {view === "list" ? "EMI Scheme" : view === "create" ? "Create EMI Scheme" : "Edit EMI Scheme"}
        </h2>
      </div>

      {view === "list" && (
        <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto border-gray-200">
          <div className="flex flex-col md:flex-row justify-between mb-5 gap-4">
            
            <div className="relative flex-shrink-0">
              <input
                type="text"
                placeholder="Search ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:border-blue-400"
              />
              <span className="absolute right-2 top-2 text-gray-400">
                <Icon icon="ic:baseline-search" />
              </span>
            </div>

            <div className="border border-gray-200 p-4 rounded-lg flex items-center justify-between gap-6 flex-grow max-w-lg">
              <div className="text-sm text-gray-700 space-y-2">
                <div className="font-semibold">Upload scheme file:</div>
                <div>
                  <input type="file" className="text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Download Sample File:</span>
                  <button className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors">
                    Download
                  </button>
                </div>
              </div>
              <button className="border border-gray-300 px-4 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 text-sm shadow-sm transition-colors">
                Upload
              </button>
            </div>

            <div className="flex-shrink-0 flex items-start">
              <button
                onClick={handleOpenCreate}
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors"
              >
                <Icon icon="ic:baseline-add" className="text-lg" /> New EMI Scheme
              </button>
            </div>
          </div>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3 text-left pl-4 font-semibold w-16">ID</th>
                <th className="p-3 text-left font-semibold">Scheme Code</th>
                <th className="p-3 text-left font-semibold">Tenure</th>
                <th className="p-3 text-left font-semibold">Advance EMI</th>
                <th className="p-3 text-left font-semibold">DBD</th>
                <th className="p-3 text-left font-semibold">PF</th>
                <th className="p-3 text-right pr-4 font-semibold w-48">
                  <button
                    onClick={() => {
                      setActionToDelete({ type: 'all' });
                      setShowConfirmationModal(true);
                    }}
                    className="px-2 py-1.5 border rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1 text-xs float-right shadow-sm transition-colors"
                  >
                    <Icon icon="mingcute:delete-2-line" className="text-sm" /> Delete All
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredSchemes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    No EMI Schemes found.
                  </td>
                </tr>
              ) : (
                filteredSchemes
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((s) => (
                    <tr key={s._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 pl-4">{s.id}</td>
                      <td className="p-3">{s.schemeCode}</td>
                      <td className="p-3">{s.tenure}</td>
                      <td className="p-3">{s.advanceEmi}</td>
                      <td className="p-3">{s.dbd}</td>
                      <td className="p-3">{s.pf}</td>
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1 shadow-sm transition-colors"
                            title="Edit"
                          >
                            <Icon icon="lucide:edit" className="text-sm" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setActionToDelete({ type: 'single', id: s._id });
                              setShowConfirmationModal(true);
                            }}
                            className="px-2 py-1 border rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1 shadow-sm transition-colors"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" className="text-sm" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {filteredSchemes.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {totalEntries > 0 ? startEntry : 0} to {endEntry} of {totalEntries} entries
              </div>
              <ReactPaginate
                previousLabel={"«"}
                nextLabel={"»"}
                breakLabel={"..."}
                pageCount={pageCount}
                marginPagesDisplayed={2}
                pageRangeDisplayed={5}
                onPageChange={handlePageClick}
                containerClassName={"flex items-center space-x-1"}
                activeClassName={"bg-blue-500 text-white border-blue-500"}
                pageClassName={"page-item"}
                pageLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
                previousClassName={"page-item"}
                previousLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
                nextClassName={"page-item"}
                nextLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
              />
            </div>
          )}
        </div>
      )}

      {(view === "create" || view === "edit") && (
        <div className="bg-white shadow-sm border rounded-lg p-6 border-gray-200 max-w-3xl">
          {view === "edit" && (
             <div className="flex justify-end mb-4">
               <button
                 onClick={() => {
                   setActionToDelete({ type: 'single', id: formData._id });
                   setShowConfirmationModal(true);
                 }}
                 className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 flex items-center gap-1 text-sm shadow-sm transition-colors"
               >
                 <Icon icon="mingcute:delete-2-line" /> Delete
               </button>
             </div>
          )}
          <form onSubmit={view === "create" ? handleCreateSubmit : handleUpdateSubmit} className="space-y-5">
            
            {view === "edit" && (
              <div className="flex items-center">
                <label className="w-1/4 text-sm font-semibold text-gray-700">ID</label>
                <input
                  type="text"
                  className="w-3/4 border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  value={formData.id}
                  disabled
                />
              </div>
            )}

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">EMI Finance Name</label>
              <input
                type="text"
                className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.emiFinanceName}
                onChange={(e) => setFormData({ ...formData, emiFinanceName: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">Scheme Code</label>
              {view === "create" ? (
                <select
                  className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400 bg-white"
                  value={formData.schemeCode}
                  onChange={handleSchemeCodeChange}
                  required
                >
                  <option value="">Select Scheme Code</option>
                  {availableProducts.map((p) => (
                    <option key={p.schemeCode} value={p.schemeCode}>
                      {p.schemeCode}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-3/4 border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  value={formData.schemeCode}
                  disabled
                />
              )}
            </div>

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">Tenure</label>
              <input
                type="number"
                className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.tenure}
                onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">Advance EMI</label>
              <input
                type="number"
                className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.advanceEmi}
                onChange={(e) => setFormData({ ...formData, advanceEmi: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">DBD</label>
              <input
                type="number"
                step="0.01"
                className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.dbd}
                onChange={(e) => setFormData({ ...formData, dbd: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/4 text-sm font-semibold text-gray-700">PF</label>
              <input
                type="number"
                step="0.01"
                className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.pf}
                onChange={(e) => setFormData({ ...formData, pf: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setView("list")}
                className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
              >
                <Icon icon="mingcute:check-line" className="text-lg" /> {view === "create" ? "Create" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {actionToDelete?.type === 'all' ? "ALL EMI Schemes" : "this EMI Scheme"}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setActionToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Icon icon="mdi:check" className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">{successMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
