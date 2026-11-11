"use client";
import { useEffect, useState, Fragment } from "react";

export default function BrandBannerManager() {
  const [brands, setBrands] = useState([]);
  const [selectedFilterRegion, setSelectedFilterRegion] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [formData, setFormData] = useState({
    brandName: "",
    brandSlug: "",
    brandImage: null,
    bannerName: "",
    bannerImage: null,
    redirectUrl: "",
    status: "Active",
    bannerStatus: "Active",
    state: "all",
    slot: 1,
  });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [messageModal, setMessageModal] = useState(null);

  const fetchBrands = async (region = selectedFilterRegion) => {
    try {
      const url = region && region !== "all" 
        ? `/api/brand/banner?region=${region}` 
        : "/api/brand/banner";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setBrands(data.brands);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [selectedFilterRegion]);

  useEffect(() => {
    if (messageModal) {
      const timer = setTimeout(() => setMessageModal(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [messageModal]);

  const handleInputChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const openModal = (brand, banner = null) => {
    setSelectedBrand(brand);
    setSelectedBanner(banner);
    setFormData({
      brandName: brand.brand_name,
      brandSlug: brand.brand_slug,
      brandImage: null,
      bannerName: banner ? banner.banner_name : "",
      bannerImage: null,
      redirectUrl: banner ? banner.redirect_url : "",
      status: brand.status,
      bannerStatus: banner ? banner.banner_status : "Active",
      state: banner ? (banner.state || "all") : "all",
      slot: banner ? (banner.slot || 1) : 1,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData();
    if (formData.brandImage) fd.append("brandImage", formData.brandImage);
    if (formData.bannerImage) fd.append("bannerImage", formData.bannerImage);
    fd.append("brand_name", formData.brandName);
    fd.append("brand_slug", formData.brandSlug);
    fd.append("status", formData.status);
    fd.append("banner_name", formData.bannerName);
    fd.append("redirect_url", formData.redirectUrl);
    fd.append("banner_status", formData.bannerStatus);
    fd.append("state", formData.state || "all");
    fd.append("slot", formData.slot || 1);

    if (selectedBrand) fd.append("brandId", selectedBrand._id);
    if (selectedBanner) fd.append("bannerId", selectedBanner._id);

    try {
      const res = await fetch("/api/brand/banner", {
        method: "POST",
        headers: { "x-admin-auth": "true" },
        body: fd,
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessageModal("Brand banner saved successfully!");
        closeModal();
        fetchBrands();
      } else {
        setMessageModal(data.error || "Error saving brand banner");
      }
    } catch (err) {
      setLoading(false);
      setMessageModal(err.message || "Network error");
    }
  };

  const handleDeleteClick = (brandId, bannerId = null) => {
    setDeleteModal({ brandId, bannerId });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      const res = await fetch("/api/brand/banner", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": "true",
        },
        body: JSON.stringify(deleteModal),
      });
      const data = await res.json();
      if (data.success) {
        setMessageModal("Deleted successfully!");
        fetchBrands();
      } else {
        setMessageModal(data.error || "Error deleting");
      }
    } catch (err) {
      setMessageModal(err.message || "Delete error");
    }
    setDeleteModal(null);
  };

  const closeModal = () => {
    setSelectedBrand(null);
    setSelectedBanner(null);
    setFormData({
      brandName: "",
      brandSlug: "",
      brandImage: null,
      bannerName: "",
      bannerImage: null,
      redirectUrl: "",
      status: "Active",
      bannerStatus: "Active",
      state: "all",
      slot: 1,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Brand Banners</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Configure region & slot specific banners for brand pages</p>
        </div>
      </div>

      {/* Region Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <label className="text-sm font-bold text-gray-700">Filter View by Region:</label>
        </div>
        <select
          value={selectedFilterRegion}
          onChange={(e) => setSelectedFilterRegion(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm font-semibold bg-amber-50 border-amber-300 text-amber-900"
        >
          <option value="all">All Banners (Global View)</option>
          <option value="karnataka">Karnataka</option>
          <option value="tamilnadu">Tamil Nadu</option>
          <option value="andhra">Andhra Pradesh</option>
          <option value="kerala">Kerala</option>
          <option value="telangana">Telangana</option>
        </select>
      </div>

      {/* ---- Responsive Layout ---- */}
      <div className="bg-white shadow rounded-xl border overflow-hidden">
        {/* Desktop & Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-xs font-bold uppercase text-gray-600 border-b">
              <tr>
                <th className="px-4 py-3 w-1/4">Brand / Banner Preview</th>
                <th className="px-4 py-3 w-1/6">Region</th>
                <th className="px-4 py-3 w-1/12">Slot</th>
                <th className="px-4 py-3 w-1/4">Redirect URL</th>
                <th className="px-4 py-3 w-1/12 text-center">Status</th>
                <th className="px-4 py-3 w-1/6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {brands.map((brand) => (
                <Fragment key={brand._id}>
                  <tr className="bg-gray-50/80 font-bold border-t">
                    <td colSpan={5} className="px-4 py-3 text-gray-900">
                      🏷️ {brand.brand_name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openModal(brand)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                      >
                        + Add Banner
                      </button>
                    </td>
                  </tr>

                  {brand.banners?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-3 text-xs text-gray-400 italic">No banners configured for this brand</td>
                    </tr>
                  ) : (
                    brand.banners?.map((banner) => (
                      <tr key={banner._id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={banner.banner_image}
                              alt="banner"
                              className="h-12 w-24 object-contain rounded border bg-gray-50 p-1"
                            />
                            <span className="text-xs font-medium text-gray-700">{banner.banner_name || 'Brand Banner'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                            {banner.state || 'all'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">
                            Slot {banner.slot || 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-600 truncate max-w-[200px]">
                          {banner.redirect_url || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded-full ${
                              banner.banner_status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {banner.banner_status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-2">
                          <button
                            onClick={() => openModal(brand, banner)}
                            className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(brand._id, banner._id)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="block md:hidden divide-y">
          {brands.map((brand) => (
            <div key={brand._id} className="p-4 space-y-3">
              <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <span className="font-bold text-gray-900 text-sm">🏷️ {brand.brand_name}</span>
                <button
                  onClick={() => openModal(brand)}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold"
                >
                  + Add
                </button>
              </div>

              {brand.banners?.map((banner) => (
                <div key={banner._id} className="border p-3 rounded-xl bg-gray-50 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={banner.banner_image}
                      alt="banner"
                      className="h-14 w-28 object-contain rounded border bg-white p-1"
                    />
                    <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 uppercase">
                          {banner.state || 'all'}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">
                          Slot {banner.slot || 1}
                        </span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${banner.banner_status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {banner.banner_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 truncate font-mono">URL: {banner.redirect_url || '—'}</p>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      onClick={() => openModal(brand, banner)}
                      className="bg-amber-500 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(brand._id, banner._id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Add/Edit Modal ---- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl font-bold"
            >
              ✖
            </button>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
              {selectedBanner
                ? "Edit Brand Banner"
                : selectedBrand
                ? `Add Banner for ${selectedBrand.brand_name}`
                : "Add Brand Banner"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Banner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brand Showcase Banner"
                  value={formData.bannerName}
                  onChange={(e) => handleInputChange("bannerName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Region</label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white font-semibold text-amber-900"
                  >
                    <option value="all">All Regions (Default)</option>
                    <option value="karnataka">Karnataka</option>
                    <option value="tamilnadu">Tamil Nadu</option>
                    <option value="andhra">Andhra Pradesh</option>
                    <option value="kerala">Kerala</option>
                    <option value="telangana">Telangana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Slot Number</label>
                  <select
                    value={formData.slot}
                    onChange={(e) => handleInputChange("slot", Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white font-bold"
                  >
                    <option value={1}>Slot 1 (Main Banner)</option>
                    <option value={2}>Slot 2</option>
                    <option value={3}>Slot 3</option>
                    <option value={4}>Slot 4</option>
                    <option value={5}>Slot 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Banner Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleInputChange("bannerImage", e.target.files[0])
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Redirect URL</label>
                <input
                  type="text"
                  placeholder="https://sathya.in/brand/samsung"
                  value={formData.redirectUrl}
                  onChange={(e) => handleInputChange("redirectUrl", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Banner Status</label>
                <select
                  value={formData.bannerStatus}
                  onChange={(e) =>
                    handleInputChange("bannerStatus", e.target.value)
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#d72828] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                  {loading ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full text-center shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-600">Are you sure you want to delete this brand banner?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Message Modal ---- */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-5 rounded-xl max-w-xs w-full text-center shadow-lg space-y-4">
            <p className="text-base font-semibold text-gray-900">{messageModal}</p>
            <button
              onClick={() => setMessageModal(null)}
              className="bg-[#d72828] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
