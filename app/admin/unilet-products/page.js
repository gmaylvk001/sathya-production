'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import AdminLoader from '@/app/admin/components/AdminLoader';

export default function UniletProductsPage() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    price: '',
    offer_price: '',
    stock: '',
    stock_status: 'In Stock',
    is_active: true,
    vendor_item_code: '',
    delivery_days: 1,
    region: 'karnataka',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Add Unilet Product Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [addForm, setAddForm] = useState({
    price: '',
    offer_price: '',
    stock: '',
    stock_status: 'In Stock',
    is_active: true,
    vendor_item_code: '',
    delivery_days: 1,
    region: 'karnataka',
  });

  // Import Excel/CSV Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRegion, setImportRegion] = useState('karnataka');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch Unilet products from API (paginated — Unilet Products module only)
  const fetchUniletProducts = async (searchTerm = activeSearch, page = currentPage) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/admin/owner-product?${params.toString()}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        setProducts(result.data);
        setTotalCount(result.count ?? result.data.length);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.page || page);
      } else {
        setProducts([]);
        setTotalCount(0);
        setTotalPages(1);
      }
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to fetch Unilet products:', err);
      showToast('Failed to load Unilet products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUniletProducts('', 1);
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    setActiveSearch(query);
    setCurrentPage(1);
    fetchUniletProducts(query, 1);
  };

  const handleClear = () => {
    setSearchQuery('');
    setActiveSearch('');
    setCurrentPage(1);
    fetchUniletProducts('', 1);
  };

  const handlePageChange = (page) => {
    const next = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(next);
    fetchUniletProducts(activeSearch, next);
  };

  // Open Edit Modal for a specific row
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditError('');
    const parentProd = item.product_id || {};
    const defaultPrice = item.price ?? parentProd.price ?? 0;
    const defaultOffer = item.offer_price ?? parentProd.special_price ?? 0;
    const defaultStock = item.stock ?? parentProd.quantity ?? 0;

    setEditForm({
      price: defaultPrice,
      offer_price: defaultOffer,
      stock: defaultStock,
      stock_status: item.stock_status || (defaultStock > 0 ? 'In Stock' : 'Out of Stock'),
      is_active: item.is_active !== false,
      vendor_item_code: item.vendor_item_code || (item.product_item_code ? `${item.product_item_code}_U` : ''),
      delivery_days: item.delivery_days || 1,
      region: item.region || 'karnataka',
    });
    setEditModalOpen(true);
  };

  // Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editingItem || !editingItem.product_id) {
      setEditError('Product reference missing.');
      return;
    }

    const priceNum = Number(editForm.price);
    const offerPriceNum = Number(editForm.offer_price);
    const stockNum = Number(editForm.stock);

    if (isNaN(priceNum) || priceNum < 0) {
      setEditError('Price must be a valid non-negative number');
      return;
    }
    if (isNaN(offerPriceNum) || offerPriceNum < 0) {
      setEditError('Offer price must be a valid non-negative number');
      return;
    }
    if (offerPriceNum > 0 && offerPriceNum > priceNum) {
      setEditError('Offer price cannot exceed standard price');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setEditError('Stock must be a valid non-negative number');
      return;
    }

    try {
      setIsSaving(true);
      const prodId = editingItem.product_id._id || editingItem.product_id;
      const res = await fetch('/api/admin/owner-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          product_id: prodId,
          product_item_code: editingItem.product_item_code || editingItem.product_id.item_code || '',
          vendor_item_code: editForm.vendor_item_code,
          price: priceNum,
          offer_price: offerPriceNum,
          stock: stockNum,
          stock_status: stockNum > 0 ? editForm.stock_status : 'Out of Stock',
          is_active: editForm.is_active,
          delivery_days: Number(editForm.delivery_days) || 1,
          region: editForm.region || 'karnataka',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Unilet inventory updated successfully!');
        setEditModalOpen(false);
        fetchUniletProducts(activeSearch);
      } else {
        setEditError(data.message || 'Failed to update Unilet record');
      }
    } catch (err) {
      setEditError(err.message || 'Error updating product');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Unilet Record
  const handleRemove = async (item) => {
    const prodTitle = item.product_id?.name || item.vendor_product_name || item.product_item_code || 'this product';
    if (!window.confirm(`Are you sure you want to remove Unilet override for "${prodTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/owner-product?id=${item._id}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (data.success) {
        showToast('Unilet product removed successfully');
        const nextPage = products.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        setCurrentPage(nextPage);
        fetchUniletProducts(activeSearch, nextPage);
      } else {
        showToast(data.message || 'Failed to delete record', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove', 'error');
    }
  };

  // Search catalog products to link
  const handleSearchCatalog = async (q) => {
    setCatalogSearch(q);
    if (!q || q.trim().length < 2) {
      setCatalogResults([]);
      return;
    }

    try {
      setIsSearchingCatalog(true);
      const res = await fetch(`/api/admin/product/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setCatalogResults(data.products || data || []);
      } else {
        // Fallback to standard product get
        const fallbackRes = await fetch(`/api/product/get`);
        if (fallbackRes.ok) {
          const allProds = await fallbackRes.json();
          const filtered = (Array.isArray(allProds) ? allProds : []).filter(
            (p) =>
              (p.name && p.name.toLowerCase().includes(q.toLowerCase())) ||
              (p.item_code && p.item_code.toLowerCase().includes(q.toLowerCase()))
          ).slice(0, 10);
          setCatalogResults(filtered);
        }
      }
    } catch (err) {
      console.error('Catalog search error:', err);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleSelectCatalogProduct = (prod) => {
    setSelectedCatalogProduct(prod);
    setCatalogResults([]);
    setCatalogSearch('');
    const code = prod.item_code || '';
    setAddForm({
      price: prod.price || '',
      offer_price: prod.special_price || 0,
      stock: prod.quantity || 0,
      stock_status: (prod.quantity || 0) > 0 ? 'In Stock' : 'Out of Stock',
      is_active: true,
      vendor_item_code: code ? `${code}_U` : '',
      delivery_days: 1,
      region: 'karnataka',
    });
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!selectedCatalogProduct) {
      showToast('Please select a product first', 'error');
      return;
    }

    const priceNum = Number(addForm.price);
    const offerPriceNum = Number(addForm.offer_price);
    const stockNum = Number(addForm.stock);

    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid number', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/owner-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          product_id: selectedCatalogProduct._id,
          product_item_code: selectedCatalogProduct.item_code || '',
          vendor_item_code: addForm.vendor_item_code,
          vendor_product_name: selectedCatalogProduct.name || '',
          price: priceNum,
          offer_price: offerPriceNum,
          stock: stockNum,
          stock_status: stockNum > 0 ? addForm.stock_status : 'Out of Stock',
          is_active: addForm.is_active,
          delivery_days: Number(addForm.delivery_days) || 1,
          region: addForm.region || 'karnataka',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Product added to Unilet successfully!');
        setAddModalOpen(false);
        setSelectedCatalogProduct(null);
        fetchUniletProducts(activeSearch);
      } else {
        showToast(data.message || 'Failed to add product', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error adding product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const allVisibleIds = products.map((item) => item._id).filter(Boolean);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allVisibleIds);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/admin/owner-product/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Selected products deleted');
        setBulkDeleteOpen(false);
        fetchUniletProducts(activeSearch);
      } else {
        showToast(data.message || 'Bulk delete failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Bulk delete failed', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleOpenImport = () => {
    setImportFile(null);
    setImportRegion('karnataka');
    setImportError('');
    setImportResult(null);
    setImportModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (activeSearch) params.set('search', activeSearch);
      const qs = params.toString();
      const url = qs
        ? `/api/admin/owner-product/export?${qs}`
        : `/api/admin/owner-product/export`;

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-admin-auth': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Export failed');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename=(.+)/i);
      link.download = match
        ? match[1].replace(/["']/g, '').trim()
        : `unilet_products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      showToast(
        activeSearch
          ? `Exported Unilet products matching "${activeSearch}"`
          : 'Unilet products exported successfully'
      );
    } catch (err) {
      console.error('Unilet export error:', err);
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setImportError('');
    setImportResult(null);

    if (!importFile) {
      setImportError('Please choose an Excel or CSV file.');
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('region', importRegion);

      const res = await fetch('/api/admin/owner-product/import', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setImportResult(data);
        showToast(data.message || 'Import completed');
        fetchUniletProducts(activeSearch);
      } else {
        setImportError(data.message || 'Import failed');
      }
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center space-x-2 transition-all ${
            toastMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-green-50 text-green-800 border-green-200'
          }`}
        >
          <Icon
            icon={toastMessage.type === 'error' ? 'mdi:alert-circle' : 'mdi:check-circle'}
            className="text-xl"
          />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Unilet Products</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage Karnataka &amp; Unilet regional pricing, offer pricing, delivery, and stock inventory.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="inline-flex items-center space-x-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon
              icon={isExporting ? 'mdi:loading' : 'mdi:download'}
              className={`text-lg ${isExporting ? 'animate-spin' : ''}`}
            />
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleOpenImport}
            className="inline-flex items-center space-x-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors"
          >
            <Icon icon="mdi:file-excel-outline" className="text-lg" />
            <span>Import Excel/CSV</span>
          </button>

          <button
            onClick={() => {
              setSelectedCatalogProduct(null);
              setCatalogSearch('');
              setCatalogResults([]);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 bg-brandRed hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            <span>Add Unilet Product</span>
          </button>
        </div>
      </div>

      {/* Search & Actions Bar (Matching Reference Image 2) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center flex-1 w-full max-w-xl space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Vendor Item Code or Item Code"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon icon="mdi:close-circle" className="text-base" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md shadow-sm transition-colors"
          >
            Search
          </button>

          {(searchQuery || activeSearch) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-2 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-3 self-end md:self-center">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-[#d72828] hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors whitespace-nowrap"
            >
              <Icon icon="mdi:trash-can-outline" className="text-lg" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <div className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Total Products: <span className="text-gray-900 font-bold">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Table Section (Matching Reference Image 2 Layout) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm text-gray-700 border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={isLoading || allVisibleIds.length === 0}
                    className="w-4 h-4 rounded cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <th className="py-3 px-3 w-12 text-center">ID</th>
                <th className="py-3 px-3 whitespace-nowrap">Product ID</th>
                <th className="py-3 px-4 min-w-[240px]">Title</th>
                <th className="py-3 px-3 whitespace-nowrap">Vendor Item Code</th>
                <th className="py-3 px-3 whitespace-nowrap">ItemCode</th>
                <th className="py-3 px-3 whitespace-nowrap text-right">Offer Price</th>
                <th className="py-3 px-3 whitespace-nowrap text-right">Price</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Stock</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Status</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Stock Status</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Delivery Location</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-gray-500">
                    <AdminLoader label="Loading Unilet products..." />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Icon icon="mdi:package-variant-remove" className="text-2xl" />
                      </div>
                      <div className="text-gray-600 font-medium">
                        {activeSearch ? `No Unilet products match "${activeSearch}"` : 'No Unilet products found.'}
                      </div>
                      <p className="text-xs text-gray-400 max-w-md">
                        {activeSearch
                          ? 'Try searching with another item code or clear the search query.'
                          : 'You can link products from Sathya catalog into Karnataka / Unilet inventory using the button above.'}
                      </p>
                      {activeSearch && (
                        <button
                          onClick={handleClear}
                          className="mt-2 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded font-medium transition"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((item, index) => {
                  const parent = item.product_id || {};
                  const title = parent.name || item.vendor_product_name || '—';
                  const itemCode = item.product_item_code || parent.item_code || '—';
                  const vendorCode = item.vendor_item_code || (itemCode !== '—' ? `${itemCode}_U` : '—');
                  const prodIdShort = parent.item_code || (parent._id ? parent._id.toString().slice(-5) : '—');
                  const offerPrice = Number(item.offer_price || 0).toFixed(2);
                  const price = Number(item.price || parent.price || 0).toFixed(2);
                  const stock = item.stock ?? parent.quantity ?? 0;
                  const isActive = item.is_active !== false;
                  const stockStatus = item.stock_status || (stock > 0 ? 'In Stock' : 'Out of Stock');
                  const location = item.region || 'Karnataka';

                  return (
                    <tr
                      key={item._id || index}
                      className={`transition-colors ${selectedIds.includes(item._id) ? 'bg-red-50/60' : 'hover:bg-gray-50/80'}`}
                    >
                      {/* Select */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item._id)}
                          onChange={() => toggleSelectOne(item._id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          aria-label={`Select ${title}`}
                        />
                      </td>

                      {/* ID */}
                      <td className="py-3 px-3 text-center text-gray-500 font-medium text-xs">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* Product ID */}
                      <td className="py-3 px-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                        {prodIdShort}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4">
                        <div className="font-normal text-gray-900 line-clamp-2 max-w-md text-xs leading-relaxed" title={title}>
                          {title}
                        </div>
                      </td>

                      {/* Vendor Item Code */}
                      <td className="py-3 px-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                        {vendorCode}
                      </td>

                      {/* ItemCode */}
                      <td className="py-3 px-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                        {itemCode}
                      </td>

                      {/* Offer Price */}
                      <td className="py-3 px-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {offerPrice}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right text-gray-900 whitespace-nowrap">
                        {price}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-center text-gray-800 font-medium whitespace-nowrap">
                        {stock}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            isActive ? 'text-gray-800' : 'text-gray-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Stock Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            stockStatus === 'In Stock' ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {stockStatus}
                        </span>
                      </td>

                      {/* Delivery Location */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-xs text-gray-700 capitalize">
                        {location}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-xs font-medium px-2.5 py-1 rounded transition-colors shadow-2xs"
                          >
                            Edit Inventory
                          </button>

                          <button
                            onClick={() => handleRemove(item)}
                            className="bg-[#d72828] hover:bg-red-700 text-white text-xs font-medium px-2.5 py-1 rounded transition-colors shadow-2xs"
                          >
                            Remove
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

        {!isLoading && totalCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-600">
              Showing{' '}
              <span className="font-semibold text-gray-800">
                {(currentPage - 1) * pageSize + 1}
              </span>
              {' '}to{' '}
              <span className="font-semibold text-gray-800">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>
              {' '}of{' '}
              <span className="font-semibold text-gray-800">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT INVENTORY MODAL */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Unilet Inventory</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update pricing &amp; stock for Karnataka / Unilet region
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-md border border-red-200">
                  {editError}
                </div>
              )}

              {/* Product Name (Read-Only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product</label>
                <div className="text-xs bg-gray-100 p-2.5 rounded-md text-gray-800 font-medium">
                  {editingItem.product_id?.name || editingItem.vendor_product_name || '—'}
                </div>
              </div>

              {/* Codes row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Code</label>
                  <input
                    type="text"
                    disabled
                    value={editingItem.product_item_code || editingItem.product_id?.item_code || ''}
                    className="w-full text-xs bg-gray-100 border border-gray-300 rounded px-2.5 py-1.5 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Item Code</label>
                  <input
                    type="text"
                    value={editForm.vendor_item_code}
                    onChange={(e) => setEditForm({ ...editForm, vendor_item_code: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. CODE_U"
                  />
                </div>
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Standard Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.offer_price}
                    onChange={(e) => setEditForm({ ...editForm, offer_price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock & Stock Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500].map((qty) => (
                      <option key={qty} value={qty}>
                        {qty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Status</label>
                  <select
                    value={editForm.stock_status}
                    onChange={(e) => setEditForm({ ...editForm, stock_status: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Region & Active Status */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Location</label>
                  <select
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white capitalize"
                  >
                    <option value="karnataka">Karnataka</option>
                    <option value="tamilnadu">Tamil Nadu</option>
                    <option value="andhra">Andhra Pradesh</option>
                    <option value="telangana">Telangana</option>
                    <option value="kerala">Kerala</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="checkbox"
                      id="edit_is_active"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="edit_is_active" className="text-xs text-gray-700 font-medium">
                      Active (Visible to Karnataka)
                    </label>
                  </div>
                </div>
              </div>

              {/* Full Product Link */}
              {editingItem.product_id?.slug && (
                <div className="pt-2">
                  <Link
                    href={`/admin/product/${editingItem.product_id.slug}`}
                    target="_blank"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>Open full product edit page</span>
                    <Icon icon="mdi:open-in-new" className="text-sm" />
                  </Link>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSaving && <Icon icon="eos-icons:loading" className="text-sm animate-spin" />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRM MODAL */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-[#d72828] mb-4">
                <Icon icon="mdi:alert-outline" className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete selected products?</h3>
              <p className="text-sm text-gray-600 mt-2">
                You are about to remove <b>{selectedIds.length}</b> Unilet product mapping(s). Sathya products are not
                affected. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-5 py-2 bg-[#d72828] hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isBulkDeleting && <Icon icon="eos-icons:loading" className="text-sm animate-spin" />}
                <span>{isBulkDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL / CSV MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Import Unilet Products</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Map vendor item codes using <span className="font-mono">reference_item_code</span> (product item code).
                </p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleImport} className="p-6 space-y-4">
              {importError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-md border border-red-200">
                  {importError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={importRegion}
                  onChange={(e) => setImportRegion(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white capitalize focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="karnataka">Karnataka</option>
                  <option value="tamilnadu">Tamil Nadu</option>
                  <option value="andhra">Andhra Pradesh</option>
                  <option value="telangana">Telangana</option>
                  <option value="kerala">Kerala</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Excel / CSV File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Uses <span className="font-mono">reference_item_code</span>,{' '}
                  <span className="font-mono">vendor_item_code</span>, <span className="font-mono">stock</span> and{' '}
                  <span className="font-mono">stock_status</span> (optional). Other columns are ignored.
                </p>
                <a
                  href="/api/admin/owner-product/import/sample"
                  className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  <Icon icon="mdi:download" className="text-sm" />
                  <span>Download sample file</span>
                </a>
              </div>

              {importResult && (
                <div className="p-3 text-xs bg-green-50 text-green-800 rounded-md border border-green-200 space-y-1">
                  <div>Total rows: <b>{importResult.totalRows}</b></div>
                  <div>Newly mapped: <b>{importResult.created}</b></div>
                  <div>Updated (already mapped): <b>{importResult.updated}</b></div>
                  <div>Not found in products (not mapped): <b>{importResult.notFoundCount}</b></div>
                  <div>Empty / NULL codes skipped: <b>{importResult.skippedEmptyCount}</b></div>
                  {importResult.notFound?.length > 0 && (
                    <div className="pt-1 text-red-700 max-h-28 overflow-y-auto">
                      <div className="font-semibold">Item codes not found:</div>
                      {importResult.notFound.map((item) => (
                        <div key={`${item.row}-${item.reference_item_code}`} className="font-mono">
                          Row {item.row}: {item.reference_item_code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isImporting && <Icon icon="eos-icons:loading" className="text-sm animate-spin" />}
                  <span>{isImporting ? 'Importing...' : 'Upload & Map'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / LINK PRODUCT MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Product to Unilet</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Link a catalog product and set Karnataka / Unilet pricing &amp; stock.
                </p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {/* Product Selection / Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Product from Catalog <span className="text-red-500">*</span>
                </label>
                {selectedCatalogProduct ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-xs text-gray-800">
                      <div className="font-semibold">{selectedCatalogProduct.name}</div>
                      <div className="text-gray-500 font-mono text-[11px] mt-0.5">
                        Code: {selectedCatalogProduct.item_code || 'N/A'} | Default Price: ₹{selectedCatalogProduct.price}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogProduct(null)}
                      className="text-xs text-red-600 hover:underline font-medium ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => handleSearchCatalog(e.target.value)}
                      placeholder="Type product name or item code to search..."
                      className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    {isSearchingCatalog && (
                      <div className="absolute right-3 top-2.5 text-gray-400">
                        <Icon icon="eos-icons:loading" className="animate-spin text-base" />
                      </div>
                    )}

                    {catalogResults.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {catalogResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => handleSelectCatalogProduct(p)}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs transition"
                          >
                            <div className="font-medium text-gray-800">{p.name}</div>
                            <div className="text-gray-500 text-[11px] font-mono">
                              Item Code: {p.item_code || 'N/A'} | MRP: ₹{p.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vendor Item Code Input Box */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vendor Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.vendor_item_code}
                  onChange={(e) => setAddForm({ ...addForm, vendor_item_code: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  placeholder="e.g. IP17E512SOFPINKMHU34_U"
                />
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unilet Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unilet Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addForm.offer_price}
                    onChange={(e) => setAddForm({ ...addForm, offer_price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 45000"
                  />
                </div>
              </div>

              {/* Quantity Select Dropdown & Stock Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.stock}
                    onChange={(e) => setAddForm({ ...addForm, stock: Number(e.target.value) })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500].map((qty) => (
                      <option key={qty} value={qty}>
                        {qty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Status</label>
                  <select
                    value={addForm.stock_status}
                    onChange={(e) => setAddForm({ ...addForm, stock_status: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Location & Active Status */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Location</label>
                  <select
                    value={addForm.region}
                    onChange={(e) => setAddForm({ ...addForm, region: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white capitalize focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="karnataka">Karnataka</option>
                    <option value="tamilnadu">Tamil Nadu</option>
                    <option value="andhra">Andhra Pradesh</option>
                    <option value="telangana">Telangana</option>
                    <option value="kerala">Kerala</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="checkbox"
                      id="add_is_active"
                      checked={addForm.is_active}
                      onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="add_is_active" className="text-xs text-gray-700 font-medium">
                      Active (Visible to Karnataka)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !selectedCatalogProduct}
                  className="px-5 py-2 bg-brandRed hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSaving && <Icon icon="eos-icons:loading" className="text-sm animate-spin" />}
                  <span>{isSaving ? 'Adding...' : 'Add to Unilet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
