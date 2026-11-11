"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  festival: "",
  effect: "fireworks",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function FestivalEffectsAdminPage() {
  const [effects, setEffects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadEffects() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/festival-effects", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load festival effects"
        );
      }

      setEffects(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEffects();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.festival.trim()) {
      setError("Festival name is required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Start and end date/time are required.");
      return;
    }

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);

    if (start >= end) {
      setError("End date/time must be after start date/time.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/festival-effects", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          festival: form.festival.trim(),
          effect: form.effect,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          isActive: form.isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save");
      }

      setMessage(
        editingId
          ? "Festival effect updated successfully."
          : "Festival effect created successfully."
      );

      notifyFestivalSync();
      resetForm();
      await loadEffects();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function notifyFestivalSync() {
    try {
      localStorage.removeItem("sathya_active_festival_effect");
      localStorage.setItem("sathya_festival_sync", Date.now().toString());
      window.dispatchEvent(new Event("festivalEffectUpdated"));
    } catch (e) {}
  }

  function handleEdit(item) {
    setEditingId(item._id);

    setForm({
      festival: item.festival || "",
      effect: item.effect || "fireworks",
      startDate: item.startDate ? toDateTimeLocal(item.startDate) : "",
      endDate: item.endDate ? toDateTimeLocal(item.endDate) : "",
      isActive: Boolean(item.isActive),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this festival effect?");

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`/api/festival-effects?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete");
      }

      notifyFestivalSync();
      setMessage("Festival effect deleted successfully.");
      await loadEffects();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggle(item) {
    try {
      setError("");
      setMessage("");

      const response = await fetch("/api/festival-effects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item._id,
          festival: item.festival,
          effect: item.effect,
          startDate: item.startDate,
          endDate: item.endDate,
          isActive: !item.isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update status");
      }

      notifyFestivalSync();
      await loadEffects();
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Festival Effects
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Schedule festive animations (Fireworks, Snowfall) for your website.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Festival Effect" : "Add Festival Effect"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            {/* Festival */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Festival
              </label>
              <input
                name="festival"
                value={form.festival}
                onChange={handleChange}
                placeholder="e.g. Diwali / Christmas"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black"
              />
            </div>

            {/* Effect */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Effect
              </label>
              <select
                name="effect"
                value={form.effect}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black"
              >
                <option value="fireworks">Fireworks</option>
                <option value="snowfall">Snowfall</option>
              </select>
            </div>

            {/* Start */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Start date & time
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black"
              />
            </div>

            {/* End */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                End date & time
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-black"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable this festival effect
                </span>
              </label>
            </div>

            {/* Submit */}
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Effect"
                  : "Create Effect"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">
              Scheduled Effects
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : effects.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No festival effects configured.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Festival</th>
                    <th className="px-6 py-4">Effect</th>
                    <th className="px-6 py-4">Start</th>
                    <th className="px-6 py-4">End</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {effects.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.festival}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase">
                          {item.effect}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(item.startDate)}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(item.endDate)}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toDateTimeLocal(date) {
  const d = new Date(date);
  const pad = (value) => String(value).padStart(2, "0");

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
