"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { flattenAdminModules, getAdminModuleLabel } from "@/lib/adminModules";

export default function RoleForm({ roleId = null }) {
  const router = useRouter();
  const isEditMode = Boolean(roleId);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissionIds: [],
  });

  const getPermissionId = (permission) => {
    if (!permission) return "";
    if (typeof permission === "string") return permission;
    return permission._id ? String(permission._id) : "";
  };

  useEffect(() => {
    fetchPermissions();
    if (roleId) {
      fetchRole();
    }
  }, [roleId]);

  const fetchPermissions = async () => {
    try {
      const response = await axios.get("/api/permissions/get");
      setPermissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const fetchRole = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/roles/get/${roleId}`);
      const role = response.data;
      setFormData({
        name: role.name || "",
        description: role.description || "",
        permissionIds: (role.permissions || []).map(getPermissionId).filter(Boolean),
      });
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Role not found");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData((prev) => {
      const alreadySelected = prev.permissionIds.includes(permissionId);
      return {
        ...prev,
        permissionIds: alreadySelected
          ? prev.permissionIds.filter((id) => id !== permissionId)
          : [...prev.permissionIds, permissionId],
      };
    });
  };

  const handleSelectAllPermissions = (e) => {
    if (e.target.checked) {
      setFormData((prev) => ({
        ...prev,
        permissionIds: permissions.map((permission) => String(permission._id)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissionIds: [],
      }));
    }
  };

  const handleSelectModulePermissions = (permissionIds, checked) => {
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          permissionIds: [...new Set([...prev.permissionIds, ...permissionIds])],
        };
      }
      return {
        ...prev,
        permissionIds: prev.permissionIds.filter((id) => !permissionIds.includes(id)),
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditMode) {
        await axios.put("/api/roles/edit", {
          roleId,
          name: formData.name,
          description: formData.description,
          permissionIds: formData.permissionIds,
        });
        setAlertMessage("✅ Role updated successfully!");
      } else {
        await axios.post("/api/roles/add", {
          name: formData.name,
          description: formData.description,
          permissionIds: formData.permissionIds,
        });
        setAlertMessage("✅ Role added successfully!");
      }

      setShowAlert(true);
      setTimeout(() => {
        router.push("/admin/roles");
      }, 1000);
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error processing request");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const allPermissionsSelected = permissions.length > 0 && formData.permissionIds.length === permissions.length;
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const moduleKey = permission.module || "other";
    if (!groups[moduleKey]) {
      groups[moduleKey] = [];
    }
    groups[moduleKey].push(permission);
    return groups;
  }, {});
  const moduleOrder = flattenAdminModules().map((item) => item.key);
  const groupedModuleKeys = [
    ...moduleOrder.filter((key) => groupedPermissions[key]),
    ...Object.keys(groupedPermissions).filter((key) => !moduleOrder.includes(key)),
  ];
  const pageTitle = isEditMode ? "Edit Role" : "Add Role";
  const submitButtonText = isEditMode ? "Update Role" : "Add Role";

  if (isLoading) {
    return <p className="mt-5">Loading...</p>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">{pageTitle}</h2>
        <button
          type="button"
          onClick={() => router.push("/admin/roles")}
          className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          Back to Roles
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-5 mb-5 border border-gray-200">
        {showAlert && (
          <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">
            {alertMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <input
              type="text"
              name="name"
              placeholder="Role Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
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

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Select Permissions</label>
              {permissions.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={allPermissionsSelected}
                    onChange={handleSelectAllPermissions}
                  />
                  Select All
                </label>
              )}
            </div>
            <div className="border rounded p-3 max-h-96 overflow-y-auto space-y-4">
              {permissions.length > 0 ? (
                groupedModuleKeys.map((moduleKey) => {
                  const modulePermissions = groupedPermissions[moduleKey];
                  const moduleIds = modulePermissions.map((permission) => String(permission._id));
                  const allModuleSelected = moduleIds.every((id) => formData.permissionIds.includes(id));
                  return (
                    <div key={moduleKey} className="border-b last:border-b-0 pb-3 last:pb-0">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                        <input
                          type="checkbox"
                          checked={allModuleSelected}
                          onChange={(e) => handleSelectModulePermissions(moduleIds, e.target.checked)}
                        />
                        {getAdminModuleLabel(moduleKey === "other" ? "" : moduleKey)}
                      </label>
                      <div className="ml-6 space-y-2">
                        {modulePermissions.map((permission) => (
                          <label key={permission._id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissionIds.includes(String(permission._id))}
                              onChange={() => handlePermissionToggle(String(permission._id))}
                            />
                            <span>{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No permissions found. Add permissions first.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isSaving ? "Saving..." : submitButtonText}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/roles")}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
