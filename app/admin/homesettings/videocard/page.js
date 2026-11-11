"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";

const STATE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Tamilnadu", value: "tamilnadu" },
  { label: "Andhra", value: "andhra" },
  { label: "Kerala", value: "kerala" },
  { label: "Karnataka", value: "karnataka" },
  { label: "Telangana", value: "telangana" },
];

export default function VideoCardPage() {
  const [videoCards, setVideoCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add Form state
  const [form, setForm] = useState({
    title: "",
    link: "",
    state: "all",
  });

  // Edit Modal state
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    link: "",
    state: "all",
    status: "Active",
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchVideoCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/videocard?admin=true");
      const data = await res.json();
      if (data.success) {
        setVideoCards(data.videoCards || []);
      } else {
        setError(data.message || "Failed to load video cards");
      }
    } catch (err) {
      setError("Failed to fetch video cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoCards();
  }, []);

  // Add new video card
  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!form.link.trim()) {
      setError("Please enter an Instagram Link.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/videocard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title?.trim() || "Instagram Reel",
          video_url: form.link.trim(),
          state: form.state,
          status: "Active",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setForm({ title: "", link: "", state: "all" });
        setSuccessMsg("Video card added successfully!");
        fetchVideoCards();
      } else {
        setError(data.message || "Failed to add video card.");
      }
    } catch (err) {
      setError("Failed to save video card.");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (card) => {
    setEditingCard(card);
    setEditForm({
      title: card.title || "",
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

  // Submit Edit Form
  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setEditError("");

    if (!editForm.link.trim()) {
      setEditError("Instagram Link cannot be empty.");
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch("/api/videocard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCard._id,
          title: editForm.title.trim(),
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
                  title: editForm.title.trim(),
                  video_url: editForm.link.trim(),
                  state: editForm.state,
                  status: editForm.status,
                }
              : item
          )
        );
        closeEditModal();
        setSuccessMsg("Video card updated successfully!");
      } else {
        setEditError(data.message || "Failed to update video card.");
      }
    } catch (err) {
      setEditError("Failed to update video card.");
    } finally {
      setUpdating(false);
    }
  };

  // Fast Status Change from table dropdown
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

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this video card?")) return;
    try {
      const res = await fetch("/api/videocard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setVideoCards((prev) => prev.filter((item) => item._id !== id));
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Failed to delete video card");
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 bg-white min-h-screen">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6 pb-3 border-b">
        <h1 className="text-2xl font-bold text-gray-800">What&apos;s Trending Video Manager</h1>
        <Link
          href="/admin/homesettings"
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition"
        >
          <ArrowLeft size={16} /> Back to Home Settings
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Inputs Form — Matching screenshot */}
      <form onSubmit={handleAdd} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Instagram Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Intagram Link</label>
            <input
              type="text"
              placeholder="Link"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            >
              {STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Green Add Button */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-medium px-6 py-2 rounded text-sm transition"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      {/* Table Section */}
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-700 text-sm">
              <th className="py-3 px-4 font-semibold w-16">#</th>
              <th className="py-3 px-4 font-semibold">Title</th>
              <th className="py-3 px-4 font-semibold w-28">Link</th>
              <th className="py-3 px-4 font-semibold w-36">Status</th>
              <th className="py-3 px-4 font-semibold w-40">State</th>
              <th className="py-3 px-4 font-semibold w-44">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Loading video cards...
                </td>
              </tr>
            ) : videoCards.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No video cards added yet.
                </td>
              </tr>
            ) : (
              videoCards.map((card, idx) => (
                <tr key={card._id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{card.title}</td>
                  <td className="py-3 px-4">
                    <a
                      href={card.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Open
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={card.status || "Active"}
                      onChange={(e) => handleStatusChange(card._id, e.target.value)}
                      className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-gray-600 capitalize">
                    {card.state || "all"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(card)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(card._id)}
                        className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-3 py-1.5 rounded text-xs font-medium transition"
                      >
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

      {/* Edit Modal Popup */}
      {editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative animate-fadeIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Video Card</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="mb-4 p-2.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                {editError}
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Instagram Link */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Instagram Link *
                </label>
                <input
                  type="text"
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* State & Status Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
