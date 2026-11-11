"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import ReactPaginate from "react-paginate";

export default function BlogFaqComponent() {
  const [faqs, setFaqs] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 15;

  // Bulk Delete State
  const [selectedFaqs, setSelectedFaqs] = useState([]);

  const handleBulkDelete = async () => {
    if (selectedFaqs.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFaqs.length} selected FAQ(s)?`)) return;

    try {
      setLoading(true);
      const res = await fetch("/api/blogs-faq/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedFaqs }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify(json.message || "FAQs deleted successfully");
        setSelectedFaqs([]);
        fetchFaqs();
      } else {
        alert(json.error || "Failed to delete FAQs");
      }
    } catch (err) {
      console.error("Error bulk deleting FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredFaqs.map((f) => f._id);
      setSelectedFaqs(allIds);
    } else {
      setSelectedFaqs([]);
    }
  };

  const handleSelectFaq = (id) => {
    setSelectedFaqs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [faqToEdit, setFaqToEdit] = useState(null);
  const [faqToDelete, setFaqToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    _id: null,
    existId: "",
    blogId: "",
    question: "",
    answer: "",
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Match state
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  // Notification message
  const [notification, setNotification] = useState("");

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/blogs-faq");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFaqs(json.data);
      }
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs-new");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBlogs(json.data);
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    }
  };

  useEffect(() => {
    fetchFaqs();
    fetchBlogs();
  }, []);

  // Run foreign-key matching
  const handleMatchFaqs = async () => {
    try {
      setIsMatching(true);
      setMatchResult(null);
      const res = await fetch("/api/blogs-faq/match", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setMatchResult(json);
        notify(json.message || "FAQs matched successfully!");
        fetchFaqs();
      } else {
        alert(json.error || "Failed to run matching");
      }
    } catch (err) {
      console.error("Error matching FAQs:", err);
      alert("Error executing match");
    } finally {
      setIsMatching(false);
    }
  };

  // Create FAQ
  const handleOpenCreate = () => {
    setFormData({
      _id: null,
      existId: "",
      blogId: "",
      question: "",
      answer: "",
    });
    setShowCreateModal(true);
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/blogs-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify("FAQ created successfully");
        setShowCreateModal(false);
        fetchFaqs();
      } else {
        alert(json.error || "Failed to create FAQ");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving FAQ");
    }
  };

  // Edit FAQ
  const handleOpenEdit = (item) => {
    setFaqToEdit(item);
    setFormData({
      _id: item._id,
      existId: item.existId || "",
      blogId: item.blogId?._id || item.blogId || "",
      question: item.question || "",
      answer: item.answer || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/blogs-faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify("FAQ updated successfully");
        setShowEditModal(false);
        fetchFaqs();
      } else {
        alert(json.error || "Failed to update FAQ");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating FAQ");
    }
  };

  // Delete FAQ
  const handleOpenDelete = (item) => {
    setFaqToDelete(item);
    setShowDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!faqToDelete) return;
    try {
      const res = await fetch(`/api/blogs-faq?id=${faqToDelete._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify("FAQ deleted successfully");
        setShowDeleteModal(false);
        fetchFaqs();
      } else {
        alert(json.error || "Failed to delete FAQ");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting FAQ");
    }
  };

  // Bulk Upload
  const handleUploadFaqCsv = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please select a file to upload");
      return;
    }
    const fd = new FormData();
    fd.append("file", uploadFile);
    try {
      setIsUploading(true);
      setUploadResult(null);
      const res = await fetch("/api/blogs-new/faq-bulk-upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUploadResult(json);
        notify("FAQs imported successfully!");
        fetchFaqs();
      } else {
        alert(json.error || "Failed to upload FAQs");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };



  // Filter & Pagination
  const filteredFaqs = faqs.filter((f) => {
    const q = searchQuery.toLowerCase();
    const questionMatch = (f.question || "").toLowerCase().includes(q);
    const answerMatch = (f.answer || "").toLowerCase().includes(q);
    const existIdMatch = (f.existId || "").toLowerCase().includes(q);
    const blogTitleMatch = (f.blogId?.blogTitle || "").toLowerCase().includes(q);
    return questionMatch || answerMatch || existIdMatch || blogTitleMatch;
  });

  const pageCount = Math.ceil(filteredFaqs.length / itemsPerPage);
  const currentItems = filteredFaqs.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="container mx-auto">
      {/* Page Title */}
      <div className="flex justify-between items-center mb-5 mt-5">
        <div>
          <h2 className="text-3xl font-light text-gray-700">Blog FAQs</h2>
          <p className="text-xs text-gray-400 mt-1">
            Separate table (<code className="bg-gray-200 px-1 rounded text-gray-700">blogs_faq</code>) linked to blogs by foreign key.
          </p>
        </div>

        {notification && (
          <div className="bg-green-600 text-white text-xs px-4 py-2 rounded shadow-md animate-fade-in flex items-center gap-1.5 font-medium">
            <Icon icon="lucide:check-circle" className="text-base" /> {notification}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto border-gray-200">
        {/* Action Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search questions, answers, exist id..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="border px-3 py-1.5 rounded w-72 focus:outline-none focus:border-blue-400 text-sm"
            />
            <span className="absolute right-2.5 top-2.5 text-gray-400">
              <Icon icon="ic:baseline-search" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedFaqs.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="border border-red-200 px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1 text-sm font-medium transition-colors"
                title="Delete Selected FAQs"
              >
                <Icon icon="mingcute:delete-2-line" className="text-base" /> Bulk Delete ({selectedFaqs.length})
              </button>
            )}

            {/* Match Button */}
            <button
              onClick={handleMatchFaqs}
              disabled={isMatching}
              className="border border-purple-200 px-3.5 py-1.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
              title="Match FAQs to blogs using existId foreign key"
            >
              <Icon icon={isMatching ? "line-md:loading-loop" : "mdi:link-variant"} className="text-lg text-purple-600" />
              {isMatching ? "Matching..." : "Match FAQs"}
            </button>

            {/* Bulk Upload Button */}
            <button
              onClick={() => {
                setUploadResult(null);
                setShowUploadModal(true);
              }}
              className="border px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium"
            >
              <Icon icon="fluent:chat-help-24-filled" className="text-base text-purple-600" /> Bulk Upload (CSV)
            </button>

            {/* New FAQ Button */}
            <button
              onClick={handleOpenCreate}
              className="border px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 text-sm font-medium shadow-sm"
            >
              <Icon icon="ic:baseline-add" className="text-lg" /> New FAQ
            </button>
          </div>
        </div>

        {/* Data Table */}
        <table className="w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <th className="p-3 text-left pl-4 font-semibold w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  onChange={handleSelectAll}
                  checked={
                    filteredFaqs.length > 0 && selectedFaqs.length === filteredFaqs.length
                  }
                />
              </th>
              <th className="p-3 text-left font-semibold w-16">#</th>
              <th className="p-3 text-left font-semibold w-24">Exist ID</th>
              <th className="p-3 text-left font-semibold w-56">Matched Blog</th>
              <th className="p-3 text-left font-semibold w-80">Question</th>
              <th className="p-3 text-left font-semibold">Answer</th>
              <th className="p-3 text-center font-semibold w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  <div className="flex justify-center items-center gap-2">
                    <Icon icon="line-md:loading-loop" className="text-xl text-blue-600" />
                    Loading FAQs from blogs_faq collection...
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-400">
                  No FAQs found in blogs_faq table. Upload a CSV or create one.
                </td>
              </tr>
            ) : (
              currentItems.map((item, index) => {
                const blogTitle = item.blogId?.blogTitle || "—";
                const blogSlug = item.blogId?.slug || "";

                return (
                  <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 pl-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedFaqs.includes(item._id)}
                        onChange={() => handleSelectFaq(item._id)}
                      />
                    </td>
                    <td className="p-3 text-gray-500 font-mono text-xs">
                      {currentPage * itemsPerPage + index + 1}
                    </td>
                    <td className="p-3 font-mono text-xs text-purple-700 font-bold">
                      {item.existId || "—"}
                    </td>
                    <td className="p-3">
                      {item.blogId ? (
                        <div>
                          <a
                            href={`/blog-listing/${blogSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-600 hover:underline line-clamp-1 text-xs"
                            title={blogTitle}
                          >
                            {blogTitle}
                          </a>
                          <span className="inline-block px-2 py-0.5 mt-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                            Linked
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                          Unlinked (Exist ID: {item.existId || "none"})
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-gray-900 text-xs sm:text-sm">
                      {item.question}
                    </td>
                    <td className="p-3 text-gray-600 text-xs line-clamp-2 leading-relaxed">
                      {item.answer}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center gap-1 font-medium"
                          title="Edit FAQ"
                        >
                          <Icon icon="lucide:edit" /> Edit
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="Delete FAQ"
                        >
                          <Icon icon="lucide:trash-2" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 gap-3 text-xs text-gray-500">
          <div>
            Showing {filteredFaqs.length > 0 ? currentPage * itemsPerPage + 1 : 0} to{" "}
            {Math.min((currentPage + 1) * itemsPerPage, filteredFaqs.length)} of {filteredFaqs.length} FAQs
          </div>

          {pageCount > 1 && (
            <ReactPaginate
              previousLabel={"<"}
              nextLabel={">"}
              breakLabel={"..."}
              pageCount={pageCount}
              marginPagesDisplayed={2}
              pageRangeDisplayed={3}
              onPageChange={({ selected }) => {
                setCurrentPage(selected);
                setSelectedFaqs([]); // Clear selection on page change
              }}
              containerClassName={"flex gap-1 items-center"}
              pageClassName={"border rounded px-2.5 py-1 text-gray-600 hover:bg-gray-100"}
              activeClassName={"bg-blue-600 text-white font-bold border-blue-600"}
              previousClassName={"border rounded px-2 py-1 hover:bg-gray-100"}
              nextClassName={"border rounded px-2 py-1 hover:bg-gray-100"}
              disabledClassName={"opacity-40 cursor-not-allowed"}
            />
          )}
        </div>
      </div>

      {/* ── CREATE FAQ MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800">Add New FAQ to Database</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign to Blog:
                </label>
                <select
                  value={formData.blogId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const b = blogs.find((x) => x._id === bId);
                    setFormData({
                      ...formData,
                      blogId: bId,
                      existId: b?.existId || formData.existId,
                    });
                  }}
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">Select Blog (Optional)</option>
                  {blogs.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.blogTitle} {b.existId ? `(SQL ID: ${b.existId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Exist ID (Foreign Key):
                </label>
                <input
                  type="text"
                  value={formData.existId}
                  onChange={(e) => setFormData({ ...formData, existId: e.target.value })}
                  placeholder="e.g. 19, 21, 26"
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Question: *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. Is 6GB RAM enough for everyday smartphone use?"
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Answer: *
                </label>
                <textarea
                  rows="4"
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="e.g. Yes. For most users, 6GB RAM is sufficient..."
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                >
                  Save to blogs_faq
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT FAQ MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800">Edit FAQ</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign to Blog:
                </label>
                <select
                  value={formData.blogId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const b = blogs.find((x) => x._id === bId);
                    setFormData({
                      ...formData,
                      blogId: bId,
                      existId: b?.existId || formData.existId,
                    });
                  }}
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">Select Blog (Optional)</option>
                  {blogs.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.blogTitle} {b.existId ? `(SQL ID: ${b.existId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Exist ID (Foreign Key):
                </label>
                <input
                  type="text"
                  value={formData.existId}
                  onChange={(e) => setFormData({ ...formData, existId: e.target.value })}
                  placeholder="e.g. 19, 21, 26"
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Question: *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Answer: *
                </label>
                <textarea
                  rows="4"
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                >
                  Update FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3 text-2xl">
              <Icon icon="lucide:alert-triangle" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete this FAQ?</h3>
            <p className="text-xs text-gray-500 mb-5">
              "{faqToDelete?.question}"
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD MODAL ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="fluent:chat-help-24-filled" className="text-2xl text-purple-600" />
                Upload FAQs to blogs_faq Table
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadFaqCsv} className="mt-4 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-900 space-y-1">
                <p className="font-semibold">SQL Foreign Key Matching:</p>
                <p>• Matches each FAQ row using <code className="bg-purple-100 px-1 rounded font-bold">exist id</code> to the blog's SQL ID or slug.</p>
                <p>• Supported SQL columns: <code className="bg-purple-100 px-1 rounded font-bold">id</code>, <code className="bg-purple-100 px-1 rounded font-bold">exist id</code>, <code className="bg-purple-100 px-1 rounded font-bold">question</code>, <code className="bg-purple-100 px-1 rounded font-bold">answer</code>, <code className="bg-purple-100 px-1 rounded">timestamp</code>.</p>

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select FAQs file (.csv, .xlsx, .xls, or MySQL TSV dump):
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border rounded p-2 focus:outline-none"
                  required
                />
              </div>

              {uploadResult && (
                <div className={`p-3 rounded-lg text-xs ${uploadResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  <p className="font-bold">Upload Results:</p>
                  <p>• Inserted/Updated in blogs_faq: {uploadResult.insertedOrUpdated ?? 0}</p>
                  <p>• Matched Blogs: {uploadResult.matchedBlogsCount ?? 0}</p>
                  {uploadResult.unmatchedExistIds?.length > 0 && (
                    <p className="text-amber-700 mt-1">
                      ⚠️ Unmatched Exist IDs: {uploadResult.unmatchedExistIds.join(", ")}
                    </p>
                  )}
                  {uploadResult.errors?.length > 0 && (
                    <p className="text-red-700 mt-1">
                      Errors: {uploadResult.errors.join("; ")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="text-lg" /> Importing...
                    </>
                  ) : (
                    "Upload & Match FAQs"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
