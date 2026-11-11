"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";

export default function LaunchProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");
  const [origin, setOrigin] = useState("");
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/launch-products?search=${search}&status=${statusFilter}&stock_status=${stockStatusFilter}`);
      const data = await res.json();
      if (data.code === 200) {
        setProducts(data.data);
      } else {
        toast.error("Failed to fetch products");
      }
    } catch (err) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, statusFilter, stockStatusFilter]);

  const triggerDelete = (id) => {
    setProductToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`/api/v1/admin/launch-products/${productToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success("Deleted successfully");
        setProducts(products.filter((p) => p._id !== productToDelete));
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting product");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  const copyToClipboard = (slug) => {
    const route = `/new_launching_product_pdp/${slug}`;
    const url = `${window.location.origin}${route}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  return (
    <div className="p-4 sm:p-6 bg-white shadow-sm rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-800">New Product Launch</h1>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3 items-center">
          <div className="relative w-64">
            <Icon icon="mdi:magnify" className="absolute left-3 top-2.5 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-brandRed"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brandRed bg-white min-w-[120px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brandRed bg-white min-w-[140px]"
          >
            <option value="">All Stock</option>
            <option value="pre_book">Pre Book</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <Link 
          href="/admin/design/new-product-launch/create"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition whitespace-nowrap"
        >
          <Icon icon="mdi:plus" className="mr-2 text-lg font-bold" />
          New Launch Product
        </Link>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-[13px] border-b border-gray-200">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Redirect URL</th>
              <th className="p-3 font-medium">Stock Status</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Updated At</th>
              <th className="p-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">No launch products found.</td>
              </tr>
            ) : (
              products.map((p) => {
                const route = `/new_launching_product_pdp/${p.slug}`;
                const fullUrl = origin ? `${origin}${route}` : route;
                
                return (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50 transition text-[13px] text-gray-700">
                    <td className="p-3 font-medium text-gray-900">{p.title}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <a href={fullUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline max-w-[200px] truncate block" title={fullUrl}>
                          {fullUrl}
                        </a>
                        <button onClick={() => copyToClipboard(p.slug)} className="text-gray-400 hover:text-gray-700">
                          <Icon icon="mdi:content-copy" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 capitalize">{(p.stock_status || "").replace(/_/g, " ")}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {(p.status || "").toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">{new Date(p.updated_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Link 
                          href={`/admin/design/new-product-launch/edit/${p._id}`}
                          className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 transition w-full justify-center"
                        >
                          <Icon icon="mdi:square-edit-outline" className="mr-1 text-sm" /> Edit
                        </Link>
                        <button 
                          onClick={() => triggerDelete(p._id)}
                          className="inline-flex items-center px-2 py-1 text-xs border border-red-300 rounded bg-brandRed text-white hover:bg-red-700 transition w-full justify-center"
                        >
                          <Icon icon="mdi:delete-outline" className="mr-1 text-sm" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
                <Icon icon="mdi:alert-circle-outline" className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">Delete Launch Product?</h3>
              <p className="text-sm text-center text-gray-500 mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteModalOpen(false); setProductToDelete(null); }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Icon icon="eos-icons:loading" className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
