"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Avoid SSR issues for react-select
const Select = dynamic(() => import("react-select"), { ssr: false });

export default function CreateStoreForm({ storeId = null }) {
  const router = useRouter();

  const [newStore, setNewStore] = useState({
    organisation_name: "",
    store_images: [null, null, null], // up to 3
    location: "",
    zipcode: "",
    address: "",
    city: "",
    images: [], // general images
    phone: "",
    website: "",
    status: "Active",
  });

  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [storeImagePreviews, setStoreImagePreviews] = useState([null, null, null]);
  const [generalImagePreviews, setGeneralImagePreviews] = useState([]);
  const [bannerPreviews, setBannerPreviews] = useState([]);
  const [featuredPreviews, setFeaturedPreviews] = useState([]); // array of urls
  const [offerPreviews, setOfferPreviews] = useState([]);
  const [highlightPreviews, setHighlightPreviews] = useState([]);

  // users/select helpers
  const [currentStep, setCurrentStep] = useState(1);
//   const [users, setUsers] = useState([]);

  useEffect(() => {
    // fetchUsers();
    if (storeId) fetchStoreData(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchStoreData = async (id) => {
    try {
      const response = await fetch(`/api/mapbox/${id}`);
      const result = await response.json();
      if (response.ok) {
        // populate state - assuming API returns fields matching newStore shape
        setNewStore((prev) => ({
          ...prev,
          organisation_name: result.organisation_name || "",
          store_images: result.store_images || [null, null, null],
          location: result.location || "",
          zipcode: result.zipcode || "",
          address: result.address || "",
          city: result.city || "",
          images: result.images || [],
          phone: result.phone || "",
          website: result.website || "",
          status: result.status || "Active",
        }));

        // Previews for images (strings or file URLs)
        setStoreImagePreviews(result.store_images || [null, null, null]);
        setGeneralImagePreviews(result.images || []);
        setBannerPreviews(result.banners || []);
        setFeaturedPreviews((result.featuredProducts || []).map((p) => p.image || null));
        setOfferPreviews((result.offers || []).map((o) => o.image || null));
        setHighlightPreviews((result.highlights || []).map((h) => h.image || null));
      } else {
        toast.error(result.error || "Failed to fetch store data for editing.");
        router.push("/api/mapbox");
      }
    } catch (err) {
      console.error("Error fetching store data:", err);
      toast.error("Failed to fetch store data: " + err.message);
      router.push("/api/mapbox");
    }
  };

  /* const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users/get");
      const result = await response.json();
      if (result.error) toast.error(result.error);
      else setUsers(result.map((u) => ({ value: u._id, label: u.name })));
    } catch (err) {
      toast.error("Failed to fetch users: " + err.message);
    }
  }; */

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStore((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // Universal file handler (logo, store_images, images, banners, featured images, offers, highlights, social thumbnail)
  const handleFileChange = (e, fieldName, index = null) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // multiple selection permitted for general images
    if (fieldName === "images") {
      const fileArray = Array.from(files);
      setNewStore((prev) => ({ ...prev, images: [...prev.images, ...fileArray] }));
      setGeneralImagePreviews((prev) => [...prev, ...fileArray.map((f) => URL.createObjectURL(f))]);
      return;
    }

    const file = files[0];

    if (fieldName === "store_images") {
      const newStoreImages = [...newStore.store_images];
      const newPreviews = [...storeImagePreviews];
      newStoreImages[index] = file;
      newPreviews[index] = URL.createObjectURL(file);
      setNewStore((prev) => ({ ...prev, store_images: newStoreImages }));
      setStoreImagePreviews(newPreviews);
      return;
    }
  };

  const handleRemoveImage = (fieldName, index) => {
    if (fieldName === "store_images") {
      const newStoreImages = [...newStore.store_images];
      const newPreviews = [...storeImagePreviews];
      newStoreImages[index] = null;
      newPreviews[index] = null;
      setNewStore((prev) => ({ ...prev, store_images: newStoreImages }));
      setStoreImagePreviews(newPreviews);
    } else if (fieldName === "images") {
      const newImages = newStore.images.filter((_, i) => i !== index);
      const newPreviews = generalImagePreviews.filter((_, i) => i !== index);
      setNewStore((prev) => ({ ...prev, images: newImages }));
      setGeneralImagePreviews(newPreviews);
    }
  };

  const addListItem = (key, template = {}) => {
    setNewStore((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));
    // add placeholder preview slots for image arrays
    /* if (key === "featuredProducts") setFeaturedPreviews((p) => [...p, null]);
    if (key === "offers") setOfferPreviews((p) => [...p, null]);
    if (key === "highlights") setHighlightPreviews((p) => [...p, null]);
    if (key === "banners") setBannerPreviews((p) => [...p, null]);
    if (key === "socialTimeline") setGeneralImagePreviews((p) => [...p, null]); // not used directly, but keeps arrays consistent */
  };

  const updateListField = (key, index, field, value) => {
    const arr = [...(newStore[key] || [])];
    arr[index] = { ...(arr[index] || {}), [field]: value };
    setNewStore((prev) => ({ ...prev, [key]: arr }));
  };

  /* const handleUserChange = (selectedOption) => {
    setNewStore((prev) => ({ ...prev, user: selectedOption ? selectedOption.value : "" }));
  }; */

  const handleNext = () => {
    const currentStepErrors = {};
    if (currentStep === 1) {
      if (!newStore.organisation_name.trim())
        currentStepErrors.organisation_name = "Organisation Name is required";
    } else if (currentStep === 2) {
      if (!newStore.address.trim()) currentStepErrors.address = "Address is required";
      if (!newStore.city.trim()) currentStepErrors.city = "City is required";
      if (!newStore.phone.trim()) currentStepErrors.phone = "Phone is required";
    }/*  else if (currentStep === 3) {
      if (!newStore.email.trim()) currentStepErrors.email = "Email is required";
      if (!newStore.user) currentStepErrors.user = "Assigned User is required";
    } */
    setErrors(currentStepErrors);
    if (Object.keys(currentStepErrors).length > 0) {
      toast.error("Please fill in all required fields for the current step.");
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // basic final validations
    const finalErrors = {};
    // if (!newStore.email.trim()) finalErrors.email = "Email is required";
    const phoneRegex = /^[0-9\-\+\s()]+$/;
    if (newStore.phone && !phoneRegex.test(newStore.phone)) finalErrors.phone = "Phone format is invalid";
    // if (!newStore.user) finalErrors.user = "Assigned User is required";
    setErrors(finalErrors);
    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please correct the errors before submitting.");
      return;
    }

    const formData = new FormData();

    // Append simple fields (category removed)
    const scalarKeys = [
      "organisation_name",
      "location",
      "zipcode",
      "address",
      "city",
      "phone",
      "website",
      "status",
    ];
    scalarKeys.forEach((k) => formData.append(k, newStore[k] ?? ""));

    // Handle tags array (string input -> try to split by comma if string)
    /* if (Array.isArray(newStore.tags)) {
      formData.append("tags", JSON.stringify(newStore.tags));
    } else if (typeof newStore.tags === "string") {
      const arr = newStore.tags.split(",").map((s) => s.trim()).filter(Boolean);
      formData.append("tags", JSON.stringify(arr));
    } */

    // Logo
    /* if (newStore.logo instanceof File) {
      formData.append("logo", newStore.logo);
    } else if (typeof newStore.logo === "string" && newStore.logo) {
      formData.append("existing_logo", newStore.logo);
    } */

    // store_images (three slots)
    newStore.store_images.forEach((img, i) => {
      if (img instanceof File) formData.append(`store_image_${i}`, img);
      else if (typeof img === "string" && img) formData.append(`existing_store_image_${i}`, img);
    });

    // additional general images
    newStore.images.forEach((img) => {
      if (img instanceof File) formData.append("images", img);
    });
    const existingImages = newStore.images.filter((img) => typeof img === "string");
    formData.append("existing_images", JSON.stringify(existingImages));

    /* // banners (files or existing urls)
    const bannerExisting = [];
    (newStore.banners || []).forEach((b) => {
      if (b instanceof File) {
        formData.append("banners", b);
      } else if (typeof b === "string") {
        bannerExisting.push(b);
      }
    });
    formData.append("existing_banners", JSON.stringify(bannerExisting)); */

    /* // featuredProducts -> images + titles
    const featuredPayload = (newStore.featuredProducts || []).map((p, idx) => {
      if (p?.image instanceof File) {
        formData.append(`featured_image_${idx}`, p.image);
        return { title: p.title || "", image: null, imageIndex: idx };
      } else {
        return { title: p?.title || "", image: p?.image || null };
      }
    });
    formData.append("featuredPayload", JSON.stringify(featuredPayload)); */

    /* // offers -> images + structured
    const offersPayload = (newStore.offers || []).map((o, idx) => {
      if (o?.image instanceof File) {
        formData.append(`offer_image_${idx}`, o.image);
        return { title: o.title || "", validTill: o.validTill || "", description: o.description || "", image: null, imageIndex: idx };
      } else {
        return { title: o.title || "", validTill: o.validTill || "", description: o.description || "", image: o?.image || null };
      }
    });
    formData.append("offersPayload", JSON.stringify(offersPayload)); */

    /* // highlights
    const highlightsPayload = (newStore.highlights || []).map((h, idx) => {
      if (h?.image instanceof File) {
        formData.append(`highlight_image_${idx}`, h.image);
        return { label: h.label || "", image: null, imageIndex: idx };
      } else {
        return { label: h.label || "", image: h?.image || null };
      }
    });
    formData.append("highlightsPayload", JSON.stringify(highlightsPayload)); */

    /* // social timeline -> media urls, postedOn, text, thumbnail files or existing thumbnails
    const socialPayload = (newStore.socialTimeline || []).map((s, idx) => {
      // append thumbnail file if present
      if (s?.thumbnailFile instanceof File) {
        formData.append(`social_thumbnail_${idx}`, s.thumbnailFile);
        return { media: s.media || "", text: s.text || "", postedOn: s.postedOn || "", thumbnail: null, thumbnailIndex: idx };
      } else {
        return { media: s.media || "", text: s.text || "", postedOn: s.postedOn || "", thumbnail: s.thumbnail || null };
      }
    });
    formData.append("socialPayload", JSON.stringify(socialPayload)); */

    /* // nearbyStores, businessHours, keyHighlights -> send as JSON
    formData.append("nearbyStores", JSON.stringify(newStore.nearbyStores || []));
    formData.append("businessHours", JSON.stringify(newStore.businessHours || []));
    formData.append("keyHighlights", JSON.stringify(newStore.keyHighlights || [])); */
formData.append("businessHours", JSON.stringify(newStore.businessHours || []));
    // decide endpoint and method
    let url = storeId ? `/api/mapbox/${storeId}` : "/api/mapbox/add";
    let method = storeId ? "PUT" : "POST";

    

    try {
      const res = await fetch(url, {
        method,
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(storeId ? "Store updated successfully!" : "Store created successfully!");
        router.push("/admin/mapbox");
      } else {
        toast.error(result.error || "Failed to save store.");
      }
    } catch (err) {
      console.error("Form submit error:", err);
      toast.error("An unexpected error occurred: " + err.message);
    }
  };

  const formTitle = storeId ? "Edit Store" : "Create New Store";
  const submitButtonText = storeId ? "Update Store" : "Create Store";

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg mt-4 border border-gray-200">
      <ToastContainer />
      <h2 className="text-2xl font-bold mb-6">{formTitle}</h2>
      <form onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
              <input type="text" name="organisation_name" className="p-2 border rounded w-full"
                onChange={handleInputChange} value={newStore.organisation_name} />
              {errors.organisation_name && <span className="text-red-500 text-sm">{errors.organisation_name}</span>}
            </div>

            {/* <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.description}></textarea>
              {errors.description && <span className="text-red-500 text-sm">{errors.description}</span>}
            </div> */}

            {/* <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Upload Logo</label>
              <input type="file" onChange={(e) => handleFileChange(e, "logo")} accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
              {logoPreview && <img src={logoPreview} className="h-20 mt-2 rounded-md object-contain" alt="Logo Preview" />}
              {errors.logo && <span className="text-red-500 text-sm">{errors.logo}</span>}
            </div> */}

            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Store Images (Max 3)</label>
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input type="file" onChange={(e) => handleFileChange(e, "store_images", index)} accept="image/*"
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                  {storeImagePreviews[index] && (
                    <div className="relative">
                      <img src={storeImagePreviews[index]} className="h-20 w-20 object-cover rounded-md" alt={`Store Image ${index + 1}`} />
                      <button type="button" onClick={() => handleRemoveImage("store_images", index)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" name="location" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.location} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
              <input type="text" name="zipcode" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.zipcode} />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="address" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.address} />
              {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Area</label>
              <input type="text" name="service_area" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.service_area} />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.city} />
            </div>

            {/* <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Additional Images</label>
              <input type="file" multiple onChange={(e) => handleFileChange(e, "images")} accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
              <div className="flex flex-wrap gap-2 mt-3">
                {generalImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img src={preview} className="h-20 w-20 object-cover rounded-md" alt={`Image ${index + 1}`} />
                    <button type="button" onClick={() => handleRemoveImage("images", index)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"><FaTimes /></button>
                  </div>
                ))}
              </div>
            </div> */}

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input name="tags" className="p-2 border rounded w-full" onChange={handleInputChange} value={Array.isArray(newStore.tags) ? newStore.tags.join(", ") : newStore.tags} />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" name="phone" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.phone} />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone After Hours</label>
              <input type="text" name="phone_after_hours" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.phone_after_hours} />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="text" name="website" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.website} />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="text" name="email" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.email} />
              {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
              <input type="text" name="twitter" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.twitter} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
              <input type="text" name="facebook" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.facebook} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input type="text" name="meta_title" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.meta_title} />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea name="meta_description" className="p-2 border rounded w-full h-24" onChange={handleInputChange} value={newStore.meta_description}></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verified</label>
              <select name="verified" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.verified}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approved</label>
              <select name="approved" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.approved}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned User</label>
              <Select options={users} className="basic-single" classNamePrefix="select" onChange={handleUserChange} value={users.find((u) => u.value === newStore.user)} placeholder="Select user..." />
              {errors.user && <span className="text-red-500 text-sm">{errors.user}</span>}
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" className="p-2 border rounded w-full" onChange={handleInputChange} value={newStore.status}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 4 – ADVANCED CONTENT */}
        {currentStep === 4 && (
          <div className="space-y-8">
            {/* BANNERS */}
            {/* <section className="border rounded p-4">
              <h3 className="text-lg font-semibold mb-3">Banner Images</h3>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileChange(e, "banners")}
                className="block w-full text-sm text-gray-600 
                  file:mr-3 file:py-1 file:px-3 file:rounded-md 
                  file:border-0 file:text-sm file:font-semibold 
                  file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />

              <div className="flex gap-2 mt-3 flex-wrap">
                {bannerPreviews.map((b, idx) => (
                  <div key={idx} className="relative">
                    <img src={b} className="h-24 w-40 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage("banners", idx)}
                      className="absolute top-0 right-0 bg-red-600 text-white 
                        rounded-full p-1 text-xs"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </section> */}

            {/* FEATURED PRODUCTS */}
            {/* <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Featured Products</h3>
                <button
                  type="button"
                  onClick={() => addListItem("featuredProducts", { image: null, title: "" })}
                  className="px-3 py-1 bg-[#d72828] text-white rounded"
                >
                  + Add
                </button>
              </div>

              {(newStore.featuredProducts || []).map((p, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-3 items-center mb-2">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "featured_image", idx)} />
                  <input type="text" placeholder="Product Title" value={p.title} onChange={(e) => updateListField("featuredProducts", idx, "title", e.target.value)} className="p-2 border rounded" />
                  <div className="flex items-center">
                    {featuredPreviews[idx] && <img src={featuredPreviews[idx]} className="h-16 w-16 rounded object-cover" />}
                    <button type="button" onClick={() => handleRemoveImage("featured", idx)} className="ml-2 bg-red-600 text-white rounded p-2"><FaTimes /></button>
                  </div>
                </div>
              ))}
            </section> */}

            {/* OFFERS */}
            {/* <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Offers</h3>
                <button type="button" onClick={() => addListItem("offers", { title: "", validTill: "", image: null, description: "" })} className="px-3 py-1 bg-[#d72828] text-white rounded">+ Add</button>
              </div>

              {(newStore.offers || []).map((o, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-3 mb-3">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "offer_image", idx)} />
                  <div className="space-y-1">
                    <input type="text" placeholder="Offer Title" value={o.title} onChange={(e) => updateListField("offers", idx, "title", e.target.value)} className="p-2 border rounded w-full" />
                    <input type="text" placeholder="Valid Till" value={o.validTill} onChange={(e) => updateListField("offers", idx, "validTill", e.target.value)} className="p-2 border rounded w-full" />
                    <textarea placeholder="Description" value={o.description} onChange={(e) => updateListField("offers", idx, "description", e.target.value)} className="p-2 border rounded w-full" />
                  </div>
                  <div className="flex items-center">
                    {offerPreviews[idx] && <img src={offerPreviews[idx]} className="h-20 w-28 rounded object-cover" />}
                    <button type="button" onClick={() => handleRemoveImage("offers", idx)} className="ml-2 bg-red-600 text-white rounded p-2"><FaTimes /></button>
                  </div>
                </div>
              ))}
            </section> */}

            {/* HIGHLIGHTS */}
            {/* <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Highlights</h3>
                <button type="button" onClick={() => addListItem("highlights", { label: "", image: null })} className="px-3 py-1 bg-[#d72828] text-white rounded">+ Add</button>
              </div>

              {(newStore.highlights || []).map((h, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-3 mb-3">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "highlight_image", idx)} />
                  <input type="text" placeholder="Label" value={h.label} onChange={(e) => updateListField("highlights", idx, "label", e.target.value)} className="p-2 border rounded" />
                  <div className="flex items-center">
                    {highlightPreviews[idx] && <img src={highlightPreviews[idx]} className="h-16 w-16 rounded object-cover" />}
                    <button type="button" onClick={() => handleRemoveImage("highlights", idx)} className="ml-2 bg-red-600 text-white rounded p-2"><FaTimes /></button>
                  </div>
                </div>
              ))}
            </section> */}

            {/* NEARBY STORES */}
            {/* <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Nearby Stores</h3>
                <button type="button" onClick={() => addListItem("nearbyStores", { name: "", address: "", rating: "" })} className="px-3 py-1 bg-[#d72828] text-white rounded">+ Add</button>
              </div>

              {(newStore.nearbyStores || []).map((s, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-3 mb-3">
                  <input className="p-2 border rounded" placeholder="Store Name" value={s.name} onChange={(e) => updateListField("nearbyStores", idx, "name", e.target.value)} />
                  <input className="p-2 border rounded" placeholder="Address" value={s.address} onChange={(e) => updateListField("nearbyStores", idx, "address", e.target.value)} />
                  <input className="p-2 border rounded" placeholder="Rating" value={s.rating} onChange={(e) => updateListField("nearbyStores", idx, "rating", e.target.value)} />
                </div>
              ))}
            </section> */}

            {/* BUSINESS HOURS */}
            <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Business Hours</h3>
                <button type="button" onClick={() => addListItem("businessHours", { day: "", timing: "" })} className="px-3 py-1 bg-[#d72828] text-white rounded">+ Add</button>
              </div>

              {(newStore.businessHours || []).map((b, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3 mb-3">
                  <input className="p-2 border rounded" placeholder="Day" value={b.day} onChange={(e) => updateListField("businessHours", idx, "day", e.target.value)} />
                  <input className="p-2 border rounded" placeholder="Timing" value={b.timing} onChange={(e) => updateListField("businessHours", idx, "timing", e.target.value)} />
                </div>
              ))}
            </section>

            {/* SOCIAL TIMELINE */}
            {/* <section className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Social Timeline</h3>
                <button type="button" onClick={() => addListItem("socialTimeline", { media: "", text: "", postedOn: "", thumbnail: "", thumbnailPreview: "", thumbnailFile: null })} className="px-3 py-1 bg-[#d72828] text-white rounded">+ Add</button>
              </div>

              {(newStore.socialTimeline || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 border p-3 rounded bg-gray-50">

                  <input type="text" className="p-2 border rounded w-full" placeholder="Media URL (FB reel, IG reel, YouTube...)" value={item.media} onChange={(e) => updateListField("socialTimeline", idx, "media", e.target.value)} />


                  <input type="text" className="p-2 border rounded w-full" placeholder="Post Text" value={item.text} onChange={(e) => updateListField("socialTimeline", idx, "text", e.target.value)} />

                  <input type="datetime-local" className="p-2 border rounded w-full" value={item.postedOn} onChange={(e) => updateListField("socialTimeline", idx, "postedOn", e.target.value)} />

                  <div>
                    <label className="text-sm font-medium block mb-1">Thumbnail Image</label>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "social_thumbnail", idx)} />
                    {item.thumbnailPreview ? (
                      <img src={item.thumbnailPreview} className="mt-2 w-24 h-24 rounded object-cover border" />
                    ) : item.thumbnail ? (
                      <img src={item.thumbnail} className="mt-2 w-24 h-24 rounded object-cover border" />
                    ) : null}
                  </div>
                </div>
              ))}
            </section> */}
          </div>
        )}

        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <button type="button" onClick={handleBack} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Previous</button>
          )}

          {currentStep < 4 && (
            <button type="button" onClick={handleNext} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Next</button>
          )}

          {currentStep === 4 && (
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{submitButtonText}</button>
          )}
        </div>
      </form>
    </div>
  );
}
