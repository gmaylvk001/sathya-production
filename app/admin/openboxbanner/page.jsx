"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OpenBoxBannerPage() {
  const [openBoxBanners, setOpenBoxBanners] = useState(null);
  const [bannerData, setBannerData] = useState({
    banners: Array(4).fill({
      banner_image: "",
      redirect_url: "",
      status: "Active",
    }),
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageErrors, setImageErrors] = useState(Array(4).fill(""));
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchOpenBoxBanners = async () => {
    try {
      const res = await fetch("/api/openboxbanner");
      const data = await res.json();
      if (data.success) {
        setOpenBoxBanners(data.openBoxBanners);
        if (data.openBoxBanners) {
          setBannerData({ banners: data.openBoxBanners.banners });
        }
      }
    } catch (err) {
      setError("Failed to fetch banners");
    }
  };

  useEffect(() => {
    fetchOpenBoxBanners();
  }, []);

  const handleInputChange = (index, field, value) => {
    setBannerData((prev) => {
      const newBanners = [...prev.banners];
      newBanners[index] = { ...newBanners[index], [field]: value };
      if (field === "banner_image") {
        const newErrors = [...imageErrors];
        newErrors[index] = "";
        setImageErrors(newErrors);
      }
      return { ...prev, banners: newBanners };
    });
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    const formData = new FormData();
    for (let i = 0; i < 4; i++) {
      if (bannerData.banners[i]?.banner_image instanceof File) {
        formData.append(
          `banner_image_${i + 1}`,
          bannerData.banners[i].banner_image,
        );
      }
      formData.append(
        `redirect_url_${i + 1}`,
        bannerData.banners[i]?.redirect_url || "",
      );
      formData.append(
        `status_${i + 1}`,
        bannerData.banners[i]?.status || "Active",
      ); // 👈
    }

    try {
      const res = await fetch("/api/openboxbanner", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setOpenBoxBanners(data.openBoxBanners);
        setBannerData({ banners: data.openBoxBanners.banners });
        setImageErrors(Array(4).fill(""));
        setSuccess("Banners saved successfully!");
         setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to save banners");
    }
  };

  const handleDeleteSingle = async (index) => {
    try {
      const res = await fetch("/api/openboxbanner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await res.json();
      if (data.success) {
        setOpenBoxBanners(data.openBoxBanners);
        setBannerData({ banners: data.openBoxBanners.banners });
        setSuccess(`Banner ${index + 1} deleted!`);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to delete banner");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch("/api/openboxbanner", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setOpenBoxBanners(null);
        setBannerData({
          banners: Array(4).fill({
            banner_image: "",
            redirect_url: "",
            status: "Active",
          }),
        });
        setShowDeleteModal(false);
        setSuccess("All banners deleted!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to delete");
        setShowDeleteModal(false);
      }
    } catch (err) {
      setError("Failed to delete");
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Open Box Banner Manager</h2>
        <Link
          href="/admin/homesettings"
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-5">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">Banner {index + 1}</h3>
                {/* Per Banner Status Toggle */}
                <select
                  value={bannerData.banners[index]?.status || "Active"}
                  onChange={(e) =>
                    handleInputChange(index, "status", e.target.value)
                  }
                  className="border px-2 py-1 rounded text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Image Preview */}
              {bannerData.banners[index]?.banner_image && (
                <div className="mb-3">
                  <img
                    src={
                      bannerData.banners[index].banner_image instanceof File
                        ? URL.createObjectURL(
                            bannerData.banners[index].banner_image,
                          )
                        : bannerData.banners[index].banner_image
                    }
                    alt={`Banner ${index + 1}`}
                    className="w-40 h-40 object-cover rounded mx-auto"
                  />
                </div>
              )}

              {/* File Input */}
              <div className="mb-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleInputChange(index, "banner_image", e.target.files[0])
                  }
                  className="border px-2 py-1 rounded w-full"
                />
                {imageErrors[index] && (
                  <p className="text-red-500 text-sm mt-1">
                    {imageErrors[index]}
                  </p>
                )}
                {success &&
                  bannerData.banners[index]?.banner_image &&
                  !(bannerData.banners[index].banner_image instanceof File) && (
                    <p className="text-green-500 text-sm mt-1">
                      Image uploaded ✅
                    </p>
                  )}
              </div>

              {/* Redirect URL */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Redirect URL (e.g. /open-box)"
                  value={bannerData.banners[index]?.redirect_url || ""}
                  onChange={(e) =>
                    handleInputChange(index, "redirect_url", e.target.value)
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              {/* Delete Single Banner */}
              {bannerData.banners[index]?.banner_image &&
                !(bannerData.banners[index].banner_image instanceof File) && (
                  <button
                    onClick={() => handleDeleteSingle(index)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove this banner
                  </button>
                )}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="bg-[#d72828] text-white px-4 py-2 rounded hover:bg-[#d72828]"
          >
            {openBoxBanners ? "Update Banners" : "Save Banners"}
          </button>
          {openBoxBanners && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete All Banners
            </button>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete all Open Box banners?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
