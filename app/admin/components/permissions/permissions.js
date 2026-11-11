import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from '@iconify/react';
import DateRangePicker from '@/components/DateRangePicker';
import { useRouter } from "next/navigation";
import { flattenAdminModules, getAdminModuleLabel } from '@/lib/adminModules';

export default function PermissionsComponent() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const adminModules = flattenAdminModules();
  const [formData, setFormData] = useState({
    name: "",
    module: "",
    description: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPermissionId, setCurrentPermissionId] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/permissions/get");
      setPermissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    setFormData({ ...formData, [name]: value });
  };

  const handleEdit = (permission) => {
    setFormData({
      name: permission.name,
      module: permission.module || "",
      description: permission.description || "",
    });
    setCurrentPermissionId(permission._id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (permissionId) => {
    try {
      const response = await axios.delete(`/api/permissions/delete`, {
        data: { permissionId },
      });

      if (response.data.success) {
        setAlertMessage("✅ Permission deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchPermissions();
      } else {
        setAlertMessage("❌ Error deleting permission");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      setAlertMessage("❌ Error deleting permission");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        await axios.put("/api/permissions/edit", {
          permissionId: currentPermissionId,
          name: formData.name,
          module: formData.module,
          description: formData.description,
        });
        setAlertMessage("✅ Permission updated successfully!");
      } else {
        await axios.post("/api/permissions/add", {
          name: formData.name,
          module: formData.module,
          description: formData.description,
        });
        setAlertMessage("✅ Permission added successfully!");
      }

      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        setIsModalOpen(false);
      }, 3000);

      fetchPermissions();
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error) {
      console.log(error);
      setAlertMessage(error.response?.data?.error || "❌ Error processing request");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      module: "",
      description: "",
    });
    setIsEditMode(false);
    setCurrentPermissionId(null);
  };

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = searchQuery === "" ||
      (permission.name && permission.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (permission.slug && permission.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (permission.module && permission.module.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (permission.description && permission.description.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && permission.createdAt) {
      const permissionDate = new Date(permission.createdAt);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      matchesDate = permissionDate >= startDate && permissionDate <= endDate;
    }

    return matchesSearch && matchesDate;
  });

  const groupOrder = [...new Set(adminModules.map((moduleItem) => moduleItem.group))];

  const getPermissionGroup = (permission) => {
    const match = adminModules.find((moduleItem) => moduleItem.key === permission.module);
    if (match) return match.group;
    const name = permission.name || "";
    return name.includes(" / ") ? name.split(" / ")[0].trim() : "Other";
  };

  const getPermissionShortName = (permission, group) => {
    const name = permission.name || "-";
    return name.startsWith(`${group} / `) ? name.slice(group.length + 3) : name;
  };

  const groupRank = (group) => {
    const index = groupOrder.indexOf(group);
    return index === -1 ? groupOrder.length : index;
  };

  const groupedPermissions = filteredPermissions
    .map((permission, index) => ({ permission, index, group: getPermissionGroup(permission) }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group) || a.group.localeCompare(b.group) || a.index - b.index);

  const totalEntries = groupedPermissions.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPermissions = groupedPermissions.slice(indexOfFirstItem, indexOfLastItem);
  const startEntry = indexOfFirstItem + 1;
  const endEntry = Math.min(indexOfLastItem, totalEntries);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startEntry} to {endEntry} of {filteredPermissions.length} entries
        </div>

        <div className="pagination flex items-center space-x-1">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-black bg-white hover:bg-gray-100"
            }`}
            aria-label="Previous page"
          >
            «
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                currentPage === i + 1
                  ? "bg-red-500 text-white"
                  : "text-black bg-white hover:bg-gray-100"
              }`}
              aria-label={`Page ${i + 1}`}
              aria-current={currentPage === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-black bg-white hover:bg-gray-100"
            }`}
            aria-label="Next page"
          >
            »
          </button>
        </div>
      </div>
    );
  };

  const modalTitle = isEditMode ? "Edit Permission" : "Add Permission";
  const submitButtonText = isEditMode ? "Update Permission" : "Add Permission";

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Permission List</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="w-full col-span-1 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateRangePicker onDateChange={handleDateChange} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => router.push("/admin/permissions/create")}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                >
                  + Add Permission
                </button>
              </div>
            </div>
            <hr className="border-t border-gray-200 mb-4" />
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Name</th>
                  <th className="p-2">Module</th>
                  <th className="p-2">Slug</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPermissions.length > 0 ? (
                  currentPermissions.map(({ permission, group }, index) => (
                    <React.Fragment key={permission._id || index}>
                    {(index === 0 || currentPermissions[index - 1].group !== group) && (
                      <tr className="bg-red-50 border-b">
                        <td colSpan="6" className="p-2 text-left font-bold text-[#d72828]">
                          {group} ({groupedPermissions.filter((item) => item.group === group).length})
                        </td>
                      </tr>
                    )}
                    <tr className="text-center border-b">
                      <td className="p-2 font-bold">{getPermissionShortName(permission, group)}</td>
                      <td className="p-2">{getAdminModuleLabel(permission.module)}</td>
                      <td className="p-2">{permission.slug || '-'}</td>
                      <td className="p-2">{permission.description || '-'}</td>
                      <td className="p-2">
                        {permission.createdAt ? new Date(permission.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(permission)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" />
                          </button>
                          <button
                            onClick={() => handleDelete(permission._id)}
                            className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-2 text-center text-gray-500">No permissions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination()}
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-96 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">{modalTitle}</h2>
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute top-3 right-3 text-red-500 text-xl"
            >
              ×
            </button>
            {showAlert && <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>}
            <form onSubmit={handleSubmit} className="mt-4">
              <input type="text" name="name" placeholder="Permission Name" value={formData.name} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
              <select name="module" value={formData.module} onChange={handleChange} className="w-full border p-2 mb-2 rounded">
                <option value="">Select Module (side menu, optional)</option>
                {adminModules.map((moduleItem) => (
                  <option key={moduleItem.key} value={moduleItem.key}>
                    {moduleItem.group === moduleItem.name ? moduleItem.name : `${moduleItem.group} / ${moduleItem.name}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mb-2">Module is the side menu item this permission can open.</p>
              <textarea name="description" placeholder="Description (optional)" value={formData.description} onChange={handleChange} className="w-full border p-2 mb-2 rounded" rows="3" />
              <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded w-full mt-2">
                {submitButtonText}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
