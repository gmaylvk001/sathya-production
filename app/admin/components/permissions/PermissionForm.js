"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { flattenAdminModules } from "@/lib/adminModules";

export default function PermissionForm() {
  const router = useRouter();
  const adminModules = flattenAdminModules();
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ message: "", type: "success" });
  const [formData, setFormData] = useState({
    name: "",
    module: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "module") {
      const selected = adminModules.find((moduleItem) => moduleItem.key === value);
      setFormData((prev) => ({
        ...prev,
        module: value,
        name: prev.name || selected?.name || "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setAlert({ message: "", type: "success" });

    try {
      await axios.post("/api/permissions/add", {
        name: formData.name,
        module: formData.module,
        description: formData.description,
      });
      setAlert({ message: "✅ Permission added successfully!", type: "success" });
      setTimeout(() => {
        router.push("/admin/permissions");
      }, 1000);
    } catch (error) {
      setAlert({
        message: error.response?.data?.error || "❌ Error processing request",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Add Permission</h2>
        <button
          type="button"
          onClick={() => router.push("/admin/permissions")}
          className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          Back to Permissions
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-5 mb-5 border border-gray-200">
        {alert.message && (
          <div
            className={`${alert.type === "error" ? "bg-red-500" : "bg-green-500"} text-white px-4 py-2 rounded-md mb-4 text-center`}
          >
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Permission Name</label>
            <input
              type="text"
              name="name"
              placeholder="Permission Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Module (optional)</label>
            <select
              name="module"
              value={formData.module}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Module (side menu, optional)</option>
              {adminModules.map((moduleItem) => (
                <option key={moduleItem.key} value={moduleItem.key}>
                  {moduleItem.group === moduleItem.name ? moduleItem.name : `${moduleItem.group} / ${moduleItem.name}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Module is the side menu item this permission can open.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              rows="3"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Add Permission"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/permissions")}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
