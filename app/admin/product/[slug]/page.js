'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdminLoader from '@/app/admin/components/AdminLoader';

export default function ProductAdminPage() {
  const params = useParams();
  const slug = params.slug;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRegion, setSelectedRegion] = useState('karnataka');

  // Karnataka Unilet Admin Form State
  const [uniletData, setUniletData] = useState({
    price: '',
    offer_price: '',
    stock: '',
    stock_status: 'In Stock',
    is_active: true,
    delivery_days: 1,
  });
  const [uniletDocId, setUniletDocId] = useState(null);
  const [isSavingUnilet, setIsSavingUnilet] = useState(false);
  const [uniletMsg, setUniletMsg] = useState({ type: '', text: '' });

  // 1. Fetch Product details from API
  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/product/${slug}`);
      const data = await res.json();

      if (data && (data._id || data.product)) {
        const prod = data.product || data;
        setProduct(prod);
        setSelectedImage(prod.images?.[0] || '');

        if (prod._id) {
          fetchUniletRecord(prod._id, selectedRegion);
        }
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Region Record for this Product
  const fetchUniletRecord = async (productId, regionKey = 'karnataka') => {
    try {
      const res = await fetch(`/api/admin/owner-product?productId=${productId}&region=${regionKey}`);
      const result = await res.json();
      if (result.success && result.data) {
        const doc = result.data;
        setUniletDocId(doc._id);
        setUniletData({
          price: doc.price ?? '',
          offer_price: doc.offer_price ?? '',
          stock: doc.stock ?? '',
          stock_status: doc.stock_status || 'In Stock',
          is_active: doc.is_active !== false,
          delivery_days: doc.delivery_days || 1,
        });
      } else {
        setUniletDocId(null);
        setUniletData({
          price: '',
          offer_price: '',
          stock: '',
          stock_status: 'In Stock',
          is_active: true,
          delivery_days: 1,
        });
      }
    } catch (err) {
      console.error('Error fetching region record:', err);
    }
  };

  useEffect(() => {
    if (slug) fetchProduct();
  }, [slug]);

  const handleRegionChange = (newRegion) => {
    setSelectedRegion(newRegion);
    setUniletMsg({ type: '', text: '' });
    if (product?._id) {
      fetchUniletRecord(product._id, newRegion);
    }
  };

  // 3. Save / Update Region Override Record
  const handleSaveUnilet = async (e) => {
    e.preventDefault();
    setUniletMsg({ type: '', text: '' });

    if (!product || !product._id) {
      setUniletMsg({ type: 'error', text: 'Parent product not loaded' });
      return;
    }

    const priceNum = Number(uniletData.price);
    const offerPriceNum = Number(uniletData.offer_price);
    const stockNum = Number(uniletData.stock);

    if (isNaN(priceNum) || priceNum < 0) {
      setUniletMsg({ type: 'error', text: 'Price must be a valid non-negative number' });
      return;
    }
    if (isNaN(offerPriceNum) || offerPriceNum < 0) {
      setUniletMsg({ type: 'error', text: 'Offer price must be a valid non-negative number' });
      return;
    }
    if (offerPriceNum > 0 && offerPriceNum > priceNum) {
      setUniletMsg({ type: 'error', text: 'Offer price cannot exceed standard price' });
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setUniletMsg({ type: 'error', text: 'Stock must be a valid non-negative number' });
      return;
    }

    try {
      setIsSavingUnilet(true);
      const res = await fetch('/api/admin/owner-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          product_id: product._id,
          product_item_code: product.item_code || '',
          price: priceNum,
          offer_price: offerPriceNum,
          stock: stockNum,
          stock_status: stockNum > 0 ? uniletData.stock_status : 'Out of Stock',
          is_active: uniletData.is_active,
          delivery_days: Number(uniletData.delivery_days) || 1,
          region: selectedRegion,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUniletDocId(data.data._id);
        setUniletMsg({ type: 'success', text: `${selectedRegion.toUpperCase()} Unilet pricing & stock updated successfully!` });
      } else {
        setUniletMsg({ type: 'error', text: data.message || 'Failed to save region record' });
      }
    } catch (err) {
      setUniletMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingUnilet(false);
    }
  };

  // 4. Delete Region Override Record
  const handleDeleteUnilet = async () => {
    if (!confirm(`Are you sure you want to delete the pricing override for ${selectedRegion.toUpperCase()}?`)) {
      return;
    }

    try {
      setIsSavingUnilet(true);
      const res = await fetch(`/api/admin/owner-product?productId=${product._id}&region=${selectedRegion}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();

      if (data.success) {
        setUniletDocId(null);
        setUniletData({
          price: '',
          offer_price: '',
          stock: '',
          stock_status: 'In Stock',
          is_active: true,
          delivery_days: 1,
        });
        setUniletMsg({ type: 'success', text: 'Region override removed successfully.' });
      } else {
        setUniletMsg({ type: 'error', text: data.message || 'Delete failed' });
      }
    } catch (err) {
      setUniletMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingUnilet(false);
    }
  };

  if (isLoading) {
    return <AdminLoader label="Loading product management details..." />;
  }

  if (!product) {
    return <div className="p-8 text-center text-red-600 font-semibold">Product not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{product.name}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Item Code: <span className="font-semibold text-gray-700">{product.item_code || 'N/A'}</span> | Slug: <span className="font-semibold text-gray-700">{product.slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Global Price: ₹{product.price}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Global Offer: ₹{product.special_price || product.price}
          </span>
        </div>
      </div>

      {/* Region Selector Header Control */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <label className="text-sm font-bold text-gray-700">Select Region for Admin View / Overrides:</label>
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="w-full sm:w-auto min-w-[220px] px-3 py-2 border rounded-lg text-sm font-semibold bg-amber-50 border-amber-300 text-amber-900 focus:ring-2 focus:ring-amber-500"
        >
          <option value="karnataka">Karnataka (Unilet Store Override)</option>
          <option value="tamilnadu">Tamil Nadu (Standard Sathya)</option>
          <option value="andhra">Andhra Pradesh (Standard Sathya)</option>
          <option value="kerala">Kerala (Standard Sathya)</option>
          <option value="telangana">Telangana (Standard Sathya)</option>
          <option value="all">All Regions (Default Sathya)</option>
        </select>
      </div>

      {/* Main Grid: Product Details & Region Pricing Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Left Column: Product Info & Images */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Product Overview</h2>
          {selectedImage && (
            <img src={selectedImage} alt={product.name} className="w-full h-48 sm:h-64 object-contain rounded-lg border bg-gray-50 p-2" />
          )}
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{product.description || 'No description provided.'}</p>
        </div>

        {/* Right Column: Region Pricing & Management Panel */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 rounded-xl shadow-md border border-amber-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-200 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-900 flex items-center gap-2">
                <span>🏷️</span> {selectedRegion === 'karnataka' ? 'Karnataka Unilet Pricing & Stock' : `${selectedRegion.toUpperCase()} Pricing Rules`}
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                {selectedRegion === 'karnataka'
                  ? 'Applies exclusively when region is set to Karnataka (560001)'
                  : 'Non-Karnataka regions default to Sathya standard catalog pricing'}
              </p>
            </div>
            {uniletDocId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-200 text-green-800 border border-green-300">
                Active Override
              </span>
            )}
          </div>

          {selectedRegion !== 'karnataka' ? (
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-start gap-3 text-amber-900">
                <span className="text-xl">ℹ️</span>
                <div>
                  <h3 className="text-sm font-bold">Standard Sathya Catalog Pricing Active</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    By default, <span className="font-semibold">{selectedRegion.toUpperCase()}</span> uses global Sathya product catalog pricing. Unilet store overrides are strictly scoped to Karnataka.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="text-gray-500 block">Catalog Price</span>
                  <span className="text-sm font-bold text-gray-900">₹{product.price}</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-gray-500 block">Offer Price</span>
                  <span className="text-sm font-bold text-emerald-800">₹{product.special_price || product.price}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {uniletMsg.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${uniletMsg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                  {uniletMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveUnilet} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unilet Standard Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder={`Global: ₹${product.price}`}
                      value={uniletData.price}
                      onChange={(e) => setUniletData({ ...uniletData, price: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unilet Offer Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Global: ₹${product.special_price || product.price}`}
                      value={uniletData.offer_price}
                      onChange={(e) => setUniletData({ ...uniletData, offer_price: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unilet Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder={`Global: ${product.quantity || 0}`}
                      value={uniletData.stock}
                      onChange={(e) => setUniletData({ ...uniletData, stock: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock Status</label>
                    <select
                      value={uniletData.stock_status}
                      onChange={(e) => setUniletData({ ...uniletData, stock_status: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uniletData.is_active}
                      onChange={(e) => setUniletData({ ...uniletData, is_active: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>Enable Karnataka Override</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {uniletDocId && (
                      <button
                        type="button"
                        onClick={handleDeleteUnilet}
                        disabled={isSavingUnilet}
                        className="px-3 py-2 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      >
                        Delete Override
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingUnilet}
                      className="px-5 py-2 text-sm font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm"
                    >
                      {isSavingUnilet ? 'Saving...' : uniletDocId ? 'Update Unilet Record' : 'Create Unilet Record'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
