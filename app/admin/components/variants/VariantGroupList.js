"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export default function VariantGroupList() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState("");

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/variants");
      const data = await res.json();
      setGroups(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/variants/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setMessage("Variant group removed. Products were not deleted.");
      setDeleteTarget(null);
      fetchGroups();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const filtered = groups.filter((group) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const names = (group.products || []).map((p) => p.name || "").join(" ");
    const codes = (group.products || []).map((p) => p.item_code || "").join(" ");
    return (
      group.name?.toLowerCase().includes(q) ||
      names.toLowerCase().includes(q) ||
      codes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Variant Groups</h1>
          <p className="text-sm text-gray-500">Group existing products as variants without duplicating them.</p>
        </div>
        <button
          onClick={() => router.push("/admin/variants/new")}
          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-500"
        >
          <FaPlus /> Add Variant Group
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="bg-white py-4 mb-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by group name, item code, or product name"
            className="w-3/4 border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {message && (
          <div className="mb-4 text-sm bg-green-50 text-green-700 border border-green-200 rounded px-3 py-2">
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading variant groups...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No variant groups yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">Group Name</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Attributes</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((group) => (
                  <tr key={group._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{group.name}</td>
                    <td className="px-4 py-3 text-gray-600">{group.productCount}</td>
                    <td className="px-4 py-3 text-gray-600">{group.attributeCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/variants/${group._id}`)}
                          className="p-2 text-blue-700 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(group)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete group"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-5">
              <h2 className="text-lg font-semibold mb-2">Remove variant group?</h2>
              <p className="text-sm text-gray-600 mb-4">
                This only removes the relationship for <strong>{deleteTarget.name}</strong>. The actual products will not be deleted.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border rounded">
                  Cancel
                </button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded">
                  Remove Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
