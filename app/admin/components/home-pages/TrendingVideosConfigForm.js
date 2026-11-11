"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Trash2, Edit2, Plus, X } from "lucide-react";

const STATE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Tamilnadu", value: "tamilnadu" },
  { label: "Andhra", value: "andhra" },
  { label: "Kerala", value: "kerala" },
  { label: "Karnataka", value: "karnataka" },
  { label: "Telangana", value: "telangana" },
];

export default function TrendingVideosConfigForm({
  pageId,
  instanceId,
  initialTitle = "Instagram Feed",
  onBackToList,
  onSaved,
}) {
  const [sectionTitle, setSectionTitle] = useState(initialTitle || "Instagram Feed");
  const [savingTitle, setSavingTitle] = useState(false);
  const [videoCards, setVideoCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add card form state (only link & state needed for Instagram reels)
  const [cardForm, setCardForm] = useState({
    link: "",
    state: "all",
  });

  // Edit modal state
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({
    link: "",
    state: "all",
    status: "Active",
  });
  const [updatingCard, setUpdatingCard] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchVideoCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/videocard?admin=true");
      const data = await res.json();
      if (data.success) {
        setVideoCards(data.videoCards || []);
      } else {
        setError(data.message || "Failed to load Instagram reels");
      }
    } catch (err) {
      setError("Failed to fetch Instagram reels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoCards();
  }, []);

  // Save Section Heading to the component instance in HomePage
  const handleSaveSectionTitle = async (e) => {
    if (e) e.preventDefault();
    if (!pageId || !instanceId) return;

    try {
      setSavingTitle(true);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`/api/home-pages/${pageId}/components`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          title: sectionTitle.trim() || "Instagram Feed",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Section heading updated successfully!");
        if (onSaved) onSaved();
      } else {
        setError(data.message || "Failed to update heading");
      }
    } catch (err) {
      setError("Failed to save section heading");
    } finally {
      setSavingTitle(false);
    }
  };

  // Add new Instagram reel/post
  const handleAddCard = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!cardForm.link.trim()) {
      setError("Please enter an Instagram Reel or Post link.");
      return;
    }

    try {
      setSavingCard(true);
      const res = await fetch("/api/videocard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Instagram Reel",
          video_url: cardForm.link.trim(),
          state: cardForm.state,
          status: "Active",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCardForm({ link: "", state: "all" });
        setSuccessMsg("Instagram reel added successfully!");
        fetchVideoCards();
      } else {
        setError(data.message || "Failed to add Instagram reel.");
      }
    } catch (err) {
      setError("Failed to save Instagram reel.");
    } finally {
      setSavingCard(false);
    }
  };

  // Fast status toggle
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch("/api/videocard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setVideoCards((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        );
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Open edit modal
  const openEditModal = (card) => {
    setEditingCard(card);
    setEditForm({
      link: card.video_url || "",
      state: card.state || "all",
      status: card.status || "Active",
    });
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingCard(null);
    setEditError("");
  };

  // Update card in modal
  const handleUpdateCard = async (e) => {
    if (e) e.preventDefault();
    setEditError("");

    if (!editForm.link.trim()) {
      setEditError("Instagram Link cannot be empty.");
      return;
    }

    try {
      setUpdatingCard(true);
      const res = await fetch("/api/videocard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCard._id,
          video_url: editForm.link.trim(),
          state: editForm.state,
          status: editForm.status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVideoCards((prev) =>
          prev.map((item) =>
            item._id === editingCard._id
              ? {
                  ...item,
                  video_url: editForm.link.trim(),
                  state: editForm.state,
                  status: editForm.status,
                }
              : item
          )
        );
        closeEditModal();
        setSuccessMsg("Instagram reel updated successfully!");
      } else {
        setEditError(data.message || "Failed to update.");
      }
    } catch (err) {
      setEditError("Failed to update Instagram reel.");
    } finally {
      setUpdatingCard(false);
    }
  };

  // Delete card
  const handleDeleteCard = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Instagram reel?")) return;
    try {
      const res = await fetch("/api/videocard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setVideoCards((prev) => prev.filter((item) => item._id !== id));
        setSuccessMsg("Instagram reel deleted.");
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Failed to delete Instagram reel");
    }
  };

  return (
    <div className="w-full">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition mr-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Instagram Feed Carousel
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add and organize Instagram reels &amp; posts displayed in the homepage carousel.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Section 1: Section Heading Configuration */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/60">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Section Heading</h3>
        <form onSubmit={handleSaveSectionTitle} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="e.g. Instagram Feed"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={savingTitle}
            className="shrink-0 bg-[#ED1C24] hover:bg-[#C4161D] text-white font-medium px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {savingTitle ? "Saving..." : "Save Heading"}
          </button>
        </form>
      </div>

      {/* Section 2: Add New Instagram Reel Form */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
          <Plus size={16} className="text-[#ED1C24]" />
          Add Instagram Reel / Post
        </h3>
        <form onSubmit={handleAddCard} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Instagram Link *
              </label>
              <input
                type="text"
                placeholder="https://www.instagram.com/reel/C_xyz123/ or /p/..."
                value={cardForm.link}
                onChange={(e) => setCardForm({ ...cardForm, link: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Target State
              </label>
              <select
                value={cardForm.state}
                onChange={(e) => setCardForm({ ...cardForm, state: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500"
              >
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingCard}
              className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-medium px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {savingCard ? "Adding..." : "Add to Carousel"}
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Reels Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Instagram Reels in Carousel ({videoCards.length})
          </span>
          <span className="text-xs text-gray-500">
            Displays in storefront Instagram Feed Carousel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 text-xs">
                <th className="py-2.5 px-3 font-semibold w-12">#</th>
                <th className="py-2.5 px-3 font-semibold">Instagram Link</th>
                <th className="py-2.5 px-3 font-semibold w-28">Status</th>
                <th className="py-2.5 px-3 font-semibold w-28">State</th>
                <th className="py-2.5 px-3 font-semibold w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                    Loading reels...
                  </td>
                </tr>
              ) : videoCards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                    No Instagram reels added yet. Paste an Instagram link above to add!
                  </td>
                </tr>
              ) : (
                videoCards.map((card, idx) => (
                  <tr key={card._id} className="hover:bg-gray-50/70 transition">
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <a
                        href={card.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-xs font-medium max-w-md truncate"
                      >
                        <span className="truncate">{card.video_url}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={card.status || "Active"}
                        onChange={(e) => handleStatusChange(card._id, e.target.value)}
                        className={`border rounded px-2 py-0.5 text-xs font-semibold focus:outline-none ${
                          (card.status || "Active") === "Active"
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-red-50 border-red-300 text-red-600"
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 capitalize text-xs">
                      {card.state || "all"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(card)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal Popup */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-semibold text-gray-800">
                Edit Instagram Reel
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Instagram Link *
                </label>
                <input
                  type="text"
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500"
                  >
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCard}
                  className="px-5 py-2 bg-[#ED1C24] hover:bg-[#C4161D] text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
                >
                  {updatingCard ? "Updating..." : "Update Reel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
