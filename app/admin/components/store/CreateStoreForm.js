"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Avoid SSR issues for react-selec
const Select = dynamic(() => import("react-select"), { ssr: false });


function ProductSearchInput({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/product/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (e) { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search product by name or item code…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
      />
      {loading && <div className="text-xs text-gray-400 mt-1.5">Searching…</div>}
      {results.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1.5">
          {results.map((prod) => (
            <div
              key={prod._id}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-0"
              onClick={() => {
                onSelect(prod);
                setQuery("");
                setResults([]);
              }}
            >
              {prod.images?.[0] && (
                <img
                  src={`/uploads/products/${prod.images[0]}`}
                  className="w-8 h-8 object-contain rounded"
                  alt={prod.name}
                />
              )}
              <div>
                <div className="text-xs font-semibold text-gray-800">{prod.name}</div>
                <div className="text-[10px] text-gray-400">{prod.item_code}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateStoreForm({ storeId = null }) {
  const router = useRouter();

  const [newStore, setNewStore] = useState({
    organisation_name: "",
    multibrandstore: false,
    description: "",
    logo: null,
    store_images: [null, null, null], // up to 3
    banners: [], // banner files or urls
    featuredProducts: [], // { image, title }
    offers: [], // { title, validTill, image, description }
    highlights: [], // { image, label }
    nearbyStores: [], // { name, address, rating }
    businessHours: [], // { day, timing }
    socialTimeline: [], // { media, text, postedOn, thumbnail, thumbnailPreview, thumbnailFile }
    customer_images: [],
    keyHighlights: [], // same as highlights
    location: "",
    location_id: "",
    zipcode: "",
    address: "",
    service_area: "",
    city: "",
    images: [], // general images
    tags: [],
    phone: "",
    phone_after_hours: "",
    website: "",
    email: "",
    twitter: "",
    facebook: "",
    meta_title: "",
    meta_description: "",
    verified: "No",
    approved: "No",
    user: "",
    status: "Active",
  });

  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [storeImagePreviews, setStoreImagePreviews] = useState([null, null, null]);
  const [generalImagePreviews, setGeneralImagePreviews] = useState([]);
  const [bannerPreviews, setBannerPreviews] = useState([]);
  const [customerImagePreviews, setCustomerImagePreviews] = useState([]);
  const [featuredPreviews, setFeaturedPreviews] = useState([]); // array of urls
  const [offerPreviews, setOfferPreviews] = useState([]);
  const [highlightPreviews, setHighlightPreviews] = useState([]);

  // users/select helpers
  const [currentStep, setCurrentStep] = useState(1);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
    if (storeId) fetchStoreData(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchStoreData = async (id) => {
    try {
      const response = await fetch(`/api/store/${id}`);
      const result = await response.json();
      if (response.ok) {
        // populate state - assuming API returns fields matching newStore shape
        setNewStore((prev) => ({
          ...prev,
          organisation_name: result.organisation_name || "",
          multibrandstore: result.multibrandstore === true,
          description: result.description || "",
          logo: result.logo || null,
          store_images: result.store_images || [null, null, null],
          banners: result.banners || [],
          featuredProducts: result.featuredProducts || [],
          offers: result.offers || [],
          highlights: result.highlights || [],
          nearbyStores: result.nearbyStores || [],
          businessHours: result.businessHours || [],
          socialTimeline: result.socialTimeline || [],
          customer_images: result.customer_images || [],
          keyHighlights: result.keyHighlights || [],
          location: result.location || "",
          location_id: result.location_id || "",
          zipcode: result.zipcode || "",
          address: result.address || "",
          service_area: result.service_area || "",
          city: result.city || "",
          images: result.images || [],
          tags: result.tags || [],
          phone: result.phone || "",
          phone_after_hours: result.phone_after_hours || "",
          website: result.website || "",
          email: result.email || "",
          twitter: result.twitter || "",
          facebook: result.facebook || "",
          meta_title: result.meta_title || "",
          meta_description: result.meta_description || "",
          verified: result.verified || "No",
          approved: result.approved || "No",
          user: result.user || "",
          status: result.status || "Active",
        }));

        // Previews for images (strings or file URLs)
        setLogoPreview(result.logo || null);
        setStoreImagePreviews(result.store_images || [null, null, null]);
        setGeneralImagePreviews(result.images || []);
        setBannerPreviews(result.banners || []);
        setCustomerImagePreviews(result.customer_images || []);
        setFeaturedPreviews((result.featuredProducts || []).map((p) => p.image || null));
        setOfferPreviews((result.offers || []).map((o) => o.image || null));
        setHighlightPreviews((result.highlights || []).map((h) => h.image || null));

         if (result.featuredProducts?.length > 0) {
  try {
    const featRes = await fetch("/api/product/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: result.featuredProducts }),
    });
    const featData = await featRes.json();
    setNewStore((prev) => ({ ...prev, featuredProducts: featData }));
  } catch (e) {
    console.error("Failed to fetch featured products", e);
  }
}

      } else {
        toast.error(result.error || "Failed to fetch store data for editing.");
        router.push("/admin/store");
      }
    } catch (err) {
      console.error("Error fetching store data:", err);
      toast.error("Failed to fetch store data: " + err.message);
      router.push("/admin/store");
    }
  };

  const fetchUsers = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch("/api/users/get", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.error) toast.error(result.error);
      else if (Array.isArray(result)) setUsers(result.map((u) => ({ value: u._id, label: u.name })));
    } catch (err) {
      toast.error("Failed to fetch users: " + err.message);
    }
  };

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

    if (fieldName === "logo") {
      setNewStore((prev) => ({ ...prev, logo: file }));
      setLogoPreview(URL.createObjectURL(file));
      return;
    }

    if (fieldName === "store_images") {
      const newStoreImages = [...newStore.store_images];
      const newPreviews = [...storeImagePreviews];
      newStoreImages[index] = file;
      newPreviews[index] = URL.createObjectURL(file);
      setNewStore((prev) => ({ ...prev, store_images: newStoreImages }));
      setStoreImagePreviews(newPreviews);
      return;
    }

    if (fieldName === "banners") {
      const fileList = Array.from(files);
      setNewStore((prev) => ({ ...prev, banners: [...prev.banners, ...fileList] }));
      setBannerPreviews((prev) => [...prev, ...fileList.map((f) => URL.createObjectURL(f))]);
      return;
    }
      if (fieldName === "customer_images") {
  const fileArray = Array.from(files);
  setNewStore((prev) => ({ ...prev, customer_images: [...prev.customer_images, ...fileArray] }));
  setCustomerImagePreviews((prev) => [...prev, ...fileArray.map((f) => URL.createObjectURL(f))]);
  return;
}

    if (fieldName === "featured_image") {
      const newFeatured = [...newStore.featuredProducts];
      if (!newFeatured[index]) newFeatured[index] = { image: null, title: "" };
      newFeatured[index].image = file;
      setNewStore((prev) => ({ ...prev, featuredProducts: newFeatured }));
      setFeaturedPreviews((prev) => {
        const arr = [...prev];
        arr[index] = URL.createObjectURL(file);
        return arr;
      });
      return;
    }

    if (fieldName === "offer_image") {
      const newOffers = [...newStore.offers];
      if (!newOffers[index]) newOffers[index] = { title: "", validTill: "", image: null, description: "" };
      newOffers[index].image = file;
      setNewStore((prev) => ({ ...prev, offers: newOffers }));
      setOfferPreviews((prev) => {
        const arr = [...prev];
        arr[index] = URL.createObjectURL(file);
        return arr;
      });
      return;
    }

    if (fieldName === "highlight_image") {
      const newHighlights = [...newStore.highlights];
      if (!newHighlights[index]) newHighlights[index] = { image: null, label: "" };
      newHighlights[index].image = file;
      setNewStore((prev) => ({ ...prev, highlights: newHighlights }));
      setHighlightPreviews((prev) => {
        const arr = [...prev];
        arr[index] = URL.createObjectURL(file);
        return arr;
      });
      return;
    }

    // social timeline thumbnail
    if (fieldName === "social_thumbnail") {
      const newSocial = [...newStore.socialTimeline];
      if (!newSocial[index]) newSocial[index] = { media: "", text: "", postedOn: "", thumbnail: "", thumbnailPreview: "", thumbnailFile: null };
      newSocial[index].thumbnailFile = file;
      newSocial[index].thumbnailPreview = URL.createObjectURL(file);
      setNewStore((prev) => ({ ...prev, socialTimeline: newSocial }));
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
    } else if (fieldName === "banners") {
      const newBanners = newStore.banners.filter((_, i) => i !== index);
      const newPreviews = bannerPreviews.filter((_, i) => i !== index);
      setNewStore((prev) => ({ ...prev, banners: newBanners }));
      setBannerPreviews(newPreviews);
    } else if (fieldName === "featured") {
      const newFeatured = [...newStore.featuredProducts];
      newFeatured.splice(index, 1);
      setNewStore((prev) => ({ ...prev, featuredProducts: newFeatured }));
      const newPreviews = [...featuredPreviews];
      newPreviews.splice(index, 1);
      setFeaturedPreviews(newPreviews);
    } else if (fieldName === "offers") {
      const newOffers = [...newStore.offers];
      newOffers.splice(index, 1);
      setNewStore((prev) => ({ ...prev, offers: newOffers }));
      const newPreviews = [...offerPreviews];
      newPreviews.splice(index, 1);
      setOfferPreviews(newPreviews);
    } else if (fieldName === "highlights") {
      const newHighlights = [...newStore.highlights];
      newHighlights.splice(index, 1);
      setNewStore((prev) => ({ ...prev, highlights: newHighlights }));
      const newPreviews = [...highlightPreviews];
      newPreviews.splice(index, 1);
      setHighlightPreviews(newPreviews);
    } else if (fieldName === "social_thumbnail") {
      const newSocial = [...newStore.socialTimeline];
      if (newSocial[index]) {
        delete newSocial[index].thumbnailFile;
        newSocial[index].thumbnailPreview = "";
        newSocial[index].thumbnail = "";
      }
      setNewStore((prev) => ({ ...prev, socialTimeline: newSocial }));
    }else if (fieldName === "customer_images") {
  setNewStore((prev) => ({ ...prev, customer_images: prev.customer_images.filter((_, i) => i !== index) }));
  setCustomerImagePreviews((prev) => prev.filter((_, i) => i !== index));
}
  };

  const addListItem = (key, template = {}) => {
    setNewStore((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));
    // add placeholder preview slots for image arrays
    if (key === "featuredProducts") setFeaturedPreviews((p) => [...p, null]);
    if (key === "offers") setOfferPreviews((p) => [...p, null]);
    if (key === "highlights") setHighlightPreviews((p) => [...p, null]);
    if (key === "banners") setBannerPreviews((p) => [...p, null]);
    if (key === "socialTimeline") setGeneralImagePreviews((p) => [...p, null]); // not used directly, but keeps arrays consistent
  };

  const updateListField = (key, index, field, value) => {
    const arr = [...(newStore[key] || [])];
    arr[index] = { ...(arr[index] || {}), [field]: value };
    setNewStore((prev) => ({ ...prev, [key]: arr }));
  };

  const handleUserChange = (selectedOption) => {
    setNewStore((prev) => ({ ...prev, user: selectedOption ? selectedOption.value : "" }));
  };

  const handleNext = () => {
    const currentStepErrors = {};
    if (currentStep === 1) {
      if (!newStore.organisation_name.trim())
        currentStepErrors.organisation_name = "Organisation Name is required";
    } else if (currentStep === 2) {
      if (!String(newStore.location_id || "").trim())
        currentStepErrors.location_id = "Location ID is required";
      if (!newStore.address.trim()) currentStepErrors.address = "Address is required";
      if (!newStore.city.trim()) currentStepErrors.city = "City is required";
      if (!newStore.phone.trim()) currentStepErrors.phone = "Phone is required";
    } else if (currentStep === 3) {
      if (!newStore.email.trim()) currentStepErrors.email = "Email is required";
      if (!newStore.user) currentStepErrors.user = "Assigned User is required";
    }
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
    if (!newStore.email.trim()) finalErrors.email = "Email is required";
    const phoneRegex = /^[0-9\-\+\s()]+$/;
    if (newStore.phone && !phoneRegex.test(newStore.phone)) finalErrors.phone = "Phone format is invalid";
    if (!newStore.user) finalErrors.user = "Assigned User is required";
    setErrors(finalErrors);
    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please correct the errors before submitting.");
      return;
    }

    const formData = new FormData();

    // Append simple fields (category removed)
    const scalarKeys = [
      "organisation_name",
      "multibrandstore",
      "description",
      "location",
      "location_id",
      "zipcode",
      "address",
      "service_area",
      "city",
      "phone",
      "phone_after_hours",
      "website",
      "email",
      "twitter",
      "facebook",
      "meta_title",
      "meta_description",
      "verified",
      "approved",
      "user",
      "status",
    ];
    scalarKeys.forEach((k) => {
      if (k === "multibrandstore") {
        formData.append(k, newStore.multibrandstore ? "true" : "false");
      } else {
        formData.append(k, newStore[k] ?? "");
      }
    });

    // Handle tags array (string input -> try to split by comma if string)
    if (Array.isArray(newStore.tags)) {
      formData.append("tags", JSON.stringify(newStore.tags));
    } else if (typeof newStore.tags === "string") {
      const arr = newStore.tags.split(",").map((s) => s.trim()).filter(Boolean);
      formData.append("tags", JSON.stringify(arr));
    }

    // Logo
    if (newStore.logo instanceof File) {
      formData.append("logo", newStore.logo);
    } else if (typeof newStore.logo === "string" && newStore.logo) {
      formData.append("existing_logo", newStore.logo);
    }

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

    // banners (files or existing urls)
    const bannerExisting = [];
    (newStore.banners || []).forEach((b) => {
      if (b instanceof File) {
        formData.append("banners", b);
      } else if (typeof b === "string") {
        bannerExisting.push(b);
      }
    });
    formData.append("existing_banners", JSON.stringify(bannerExisting));

     // featuredProducts — product IDs only
    formData.append(
      "featuredProducts",
      JSON.stringify(
        (newStore.featuredProducts || []).map((p) => p._id || p)
      )
    );

    // offers -> images + structured
    const offersPayload = (newStore.offers || []).map((o, idx) => {
      if (o?.image instanceof File) {
        formData.append(`offer_image_${idx}`, o.image);
        return { title: o.title || "", validTill: o.validTill || "", description: o.description || "", image: null, imageIndex: idx };
      } else {
        return { title: o.title || "", validTill: o.validTill || "", description: o.description || "", image: o?.image || null };
      }
    });
    formData.append("offersPayload", JSON.stringify(offersPayload));

    // highlights
    const highlightsPayload = (newStore.highlights || []).map((h, idx) => {
      if (h?.image instanceof File) {
        formData.append(`highlight_image_${idx}`, h.image);
        return { label: h.label || "", image: null, imageIndex: idx };
      } else {
        return { label: h.label || "", image: h?.image || null };
      }
    });
    formData.append("highlightsPayload", JSON.stringify(highlightsPayload));

    // social timeline -> media urls, postedOn, text, thumbnail files or existing thumbnails
    const socialPayload = (newStore.socialTimeline || []).map((s, idx) => {
      // append thumbnail file if present
      if (s?.thumbnailFile instanceof File) {
        formData.append(`social_thumbnail_${idx}`, s.thumbnailFile);
        return { media: s.media || "", text: s.text || "", postedOn: s.postedOn || "", thumbnail: null, thumbnailIndex: idx };
      } else {
        return { media: s.media || "", text: s.text || "", postedOn: s.postedOn || "", thumbnail: s.thumbnail || null };
      }
    });
    formData.append("socialPayload", JSON.stringify(socialPayload));

     // customer_images
const customerExisting = [];
(newStore.customer_images || []).forEach((img, i) => {
  if (img instanceof File) {
    formData.append("customer_images", img);
  } else if (typeof img === "string") {
    customerExisting.push(img);
  }
});
formData.append("existing_customer_images", JSON.stringify(customerExisting));

    // nearbyStores, businessHours, keyHighlights -> send as JSON
    formData.append("nearbyStores", JSON.stringify(newStore.nearbyStores || []));
    formData.append("businessHours", JSON.stringify(newStore.businessHours || []));
    formData.append("keyHighlights", JSON.stringify(newStore.keyHighlights || []));

    // decide endpoint and method
    let url = storeId ? `/api/store/${storeId}` : "/api/store/add";
    let method = storeId ? "PUT" : "POST";

    

    try {
      const res = await fetch(url, {
        method,
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(storeId ? "Store updated successfully!" : "Store created successfully!");
        router.push("/admin/store");
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
  const storeSteps = [
    { title: "Basics", desc: "Name, type & media" },
    { title: "Location", desc: "Address & contact" },
    { title: "SEO & access", desc: "Meta, user & status" },
    { title: "Content", desc: "Banners & extras" },
  ];
  const fieldClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const sectionClass = "rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4";
  const fileInputClass =
    "block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#ED1C24] hover:file:bg-red-100 cursor-pointer";
  const addBtnClass =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition";

  return (
    <div className="max-w-6xl mx-auto mt-4 mb-8">
      <ToastContainer />
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-gray-900">{formTitle}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Step {currentStep} of {storeSteps.length} — {storeSteps[currentStep - 1].desc}
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex gap-1 sm:gap-2">
            {storeSteps.map((step, index) => {
              const stepNum = index + 1;
              const active = currentStep === stepNum;
              const done = currentStep > stepNum;
              return (
                <div
                  key={step.title}
                  className={`flex-1 rounded-lg px-2 sm:px-3 py-2.5 border transition ${
                    active
                      ? "border-[#ED1C24] bg-red-50"
                      : done
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-6 w-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center ${
                        active
                          ? "bg-[#ED1C24] text-white"
                          : done
                            ? "bg-emerald-500 text-white"
                            : "bg-white text-gray-500 border border-gray-200"
                      }`}
                    >
                      {done ? "✓" : stepNum}
                    </span>
                    <div className="min-w-0 hidden sm:block">
                      <p
                        className={`text-xs font-semibold truncate ${
                          active ? "text-[#ED1C24]" : done ? "text-emerald-700" : "text-gray-600"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{step.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#ED1C24] transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (storeSteps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {currentStep === 1 && (
            <div className="space-y-5">
              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">Store identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Organisation Name <span className="text-[#ED1C24]">*</span>
                    </label>
                    <input
                      type="text"
                      name="organisation_name"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.organisation_name}
                      placeholder="Store / organisation name"
                    />
                    {errors.organisation_name && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.organisation_name}</span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Store Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNewStore((prev) => ({ ...prev, multibrandstore: false }))
                        }
                        className={`rounded-lg border px-3 py-3 text-sm font-medium text-left transition ${
                          !newStore.multibrandstore
                            ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Executive Store
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewStore((prev) => ({ ...prev, multibrandstore: true }))
                        }
                        className={`rounded-lg border px-3 py-3 text-sm font-medium text-left transition ${
                          newStore.multibrandstore
                            ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Multi Brand Store
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      name="description"
                      className={fieldClass}
                      rows={3}
                      onChange={handleInputChange}
                      value={newStore.description}
                      placeholder="Short store description"
                    />
                    {errors.description && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.description}</span>
                    )}
                  </div>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">Media & place</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Upload Logo</label>
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, "logo")}
                        accept="image/*"
                        className={fileInputClass}
                      />
                      {logoPreview && (
                        <img
                          src={logoPreview}
                          className="h-20 mt-3 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1"
                          alt="Logo Preview"
                        />
                      )}
                      {errors.logo && (
                        <span className="text-red-500 text-sm mt-1 block">{errors.logo}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Store Images</label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewStore((prev) => ({
                            ...prev,
                            store_images: [...prev.store_images, null],
                          }));
                          setStoreImagePreviews((prev) => [...prev, null]);
                        }}
                        className={addBtnClass}
                      >
                        <FaPlus size={10} /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {newStore.store_images.map((_, index) => (
                        <div key={index} className="relative">
                          {storeImagePreviews[index] ? (
                            <>
                              <img
                                src={storeImagePreviews[index]}
                                className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                                alt={`Store Image ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage("store_images", index)}
                                className="absolute -top-1.5 -right-1.5 bg-[#ED1C24] text-white rounded-full p-1 text-xs shadow"
                              >
                                <FaTimes size={10} />
                              </button>
                            </>
                          ) : (
                            <label className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#ED1C24] hover:bg-red-50 transition bg-white">
                              <FaPlus className="text-gray-400 mb-1" size={16} />
                              <span className="text-[10px] text-gray-400">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, "store_images", index)}
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Location</label>
                    <input
                      type="text"
                      name="location"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.location}
                      placeholder="Area / locality"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Zipcode</label>
                    <input
                      type="text"
                      name="zipcode"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.zipcode}
                      placeholder="PIN / zip"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {currentStep === 2 && (
            <section className={sectionClass}>
              <h3 className="text-sm font-semibold text-gray-900">Address & contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Location ID <span className="text-[#ED1C24]">*</span>
                  </label>
                  <input
                    type="text"
                    name="location_id"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.location_id}
                    placeholder="e.g. LOC001"
                  />
                  {errors.location_id && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.location_id}</span>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    name="address"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.address}
                    placeholder="Full street address"
                  />
                  {errors.address && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.address}</span>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Service Area</label>
                  <input
                    type="text"
                    name="service_area"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.service_area}
                  />
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    name="city"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.city}
                  />
                </div>

                <div>
                  <label className={labelClass}>Additional Images</label>
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileChange(e, "images")}
                      accept="image/*"
                      className={fileInputClass}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {generalImagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                            alt={`Image ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("images", index)}
                            className="absolute -top-1.5 -right-1.5 bg-[#ED1C24] text-white rounded-full p-1 text-xs"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Tags (comma separated)</label>
                  <input
                    name="tags"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={Array.isArray(newStore.tags) ? newStore.tags.join(", ") : newStore.tags}
                    placeholder="e.g. electronics, service"
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.phone}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone After Hours</label>
                  <input
                    type="text"
                    name="phone_after_hours"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.phone_after_hours}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Website</label>
                  <input
                    type="text"
                    name="website"
                    className={fieldClass}
                    onChange={handleInputChange}
                    value={newStore.website}
                    placeholder="https://"
                  />
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">Contact & social</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="text"
                      name="email"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.email}
                    />
                    {errors.email && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Twitter</label>
                    <input
                      type="text"
                      name="twitter"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.twitter}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Facebook</label>
                    <input
                      type="text"
                      name="facebook"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.facebook}
                    />
                  </div>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">SEO & publishing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Meta Title</label>
                    <input
                      type="text"
                      name="meta_title"
                      className={fieldClass}
                      onChange={handleInputChange}
                      value={newStore.meta_title}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Meta Description</label>
                    <textarea
                      name="meta_description"
                      className={`${fieldClass} h-24`}
                      onChange={handleInputChange}
                      value={newStore.meta_description}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Verified</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["No", "Yes"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setNewStore((prev) => ({ ...prev, verified: v }))}
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            newStore.verified === v
                              ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Approved</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["No", "Yes"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setNewStore((prev) => ({ ...prev, approved: v }))}
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            newStore.approved === v
                              ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Assigned User</label>
                    <Select
                      options={users}
                      className="basic-single"
                      classNamePrefix="select"
                      onChange={handleUserChange}
                      value={users.find((u) => u.value === newStore.user)}
                      placeholder="Select user…"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          minHeight: "42px",
                          borderColor: state.isFocused ? "#ED1C24" : "#d1d5db",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(215,40,40,0.15)"
                            : "none",
                        }),
                      }}
                    />
                    {errors.user && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.user}</span>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Active", "Inactive"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewStore((prev) => ({ ...prev, status: s }))}
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            newStore.status === s
                              ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">Banner Images</h3>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "banners")}
                  className={fileInputClass}
                />
                <div className="flex gap-2 mt-1 flex-wrap">
                  {bannerPreviews.map((b, idx) => (
                    <div key={idx} className="relative">
                      <img src={b} className="h-24 w-40 object-cover rounded-lg border border-gray-100" alt="" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("banners", idx)}
                        className="absolute -top-1.5 -right-1.5 bg-[#ED1C24] text-white rounded-full p-1 text-xs"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Featured Products</h3>
                <ProductSearchInput
                  onSelect={(product) => {
                    const alreadyAdded = newStore.featuredProducts.some(
                      (p) => p._id === product._id
                    );
                    if (!alreadyAdded) {
                      setNewStore((prev) => ({
                        ...prev,
                        featuredProducts: [...prev.featuredProducts, product],
                      }));
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {newStore.featuredProducts.map((prod, idx) => (
                    <div
                      key={prod._id || idx}
                      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                    >
                      {prod.images?.[0] && (
                        <img
                          src={`/uploads/products/${prod.images[0]}`}
                          className="w-8 h-8 object-contain rounded"
                          alt={prod.name}
                        />
                      )}
                      <span className="text-xs font-medium text-gray-800">{prod.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewStore((prev) => ({
                            ...prev,
                            featuredProducts: prev.featuredProducts.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-[#ED1C24] ml-1"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={sectionClass}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Offers</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addListItem("offers", {
                        title: "",
                        validTill: "",
                        image: null,
                        description: "",
                      })
                    }
                    className={addBtnClass}
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
                {(newStore.offers || []).map((o, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "offer_image", idx)}
                      className={fileInputClass}
                    />
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Offer Title"
                        value={o.title}
                        onChange={(e) => updateListField("offers", idx, "title", e.target.value)}
                        className={fieldClass}
                      />
                      <input
                        type="text"
                        placeholder="Valid Till"
                        value={o.validTill}
                        onChange={(e) =>
                          updateListField("offers", idx, "validTill", e.target.value)
                        }
                        className={fieldClass}
                      />
                      <textarea
                        placeholder="Description"
                        value={o.description}
                        onChange={(e) =>
                          updateListField("offers", idx, "description", e.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {offerPreviews[idx] && (
                        <img
                          src={offerPreviews[idx]}
                          className="h-20 w-28 rounded-lg object-cover border border-gray-100"
                          alt=""
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("offers", idx)}
                        className="bg-[#ED1C24] text-white rounded-lg p-2"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <section className={sectionClass}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Highlights</h3>
                  <button
                    type="button"
                    onClick={() => addListItem("highlights", { label: "", image: null })}
                    className={addBtnClass}
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
                {(newStore.highlights || []).map((h, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "highlight_image", idx)}
                      className={fileInputClass}
                    />
                    <input
                      type="text"
                      placeholder="Label"
                      value={h.label}
                      onChange={(e) => updateListField("highlights", idx, "label", e.target.value)}
                      className={fieldClass}
                    />
                    <div className="flex items-center gap-2">
                      {highlightPreviews[idx] && (
                        <img
                          src={highlightPreviews[idx]}
                          className="h-16 w-16 rounded-lg object-cover border border-gray-100"
                          alt=""
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("highlights", idx)}
                        className="bg-[#ED1C24] text-white rounded-lg p-2"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <section className={sectionClass}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Nearby Stores</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addListItem("nearbyStores", { name: "", address: "", rating: "" })
                    }
                    className={addBtnClass}
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
                {(newStore.nearbyStores || []).map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      className={fieldClass}
                      placeholder="Store Name"
                      value={s.name}
                      onChange={(e) =>
                        updateListField("nearbyStores", idx, "name", e.target.value)
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="Address"
                      value={s.address}
                      onChange={(e) =>
                        updateListField("nearbyStores", idx, "address", e.target.value)
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="Rating"
                      value={s.rating}
                      onChange={(e) =>
                        updateListField("nearbyStores", idx, "rating", e.target.value)
                      }
                    />
                  </div>
                ))}
              </section>

              <section className={sectionClass}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
                  <button
                    type="button"
                    onClick={() => addListItem("businessHours", { day: "", timing: "" })}
                    className={addBtnClass}
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
                {(newStore.businessHours || []).map((b, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className={fieldClass}
                      placeholder="Day"
                      value={b.day}
                      onChange={(e) =>
                        updateListField("businessHours", idx, "day", e.target.value)
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="Timing"
                      value={b.timing}
                      onChange={(e) =>
                        updateListField("businessHours", idx, "timing", e.target.value)
                      }
                    />
                  </div>
                ))}
              </section>

              <section className={sectionClass}>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Social Timeline</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addListItem("socialTimeline", {
                        media: "",
                        text: "",
                        postedOn: "",
                        thumbnail: "",
                        thumbnailPreview: "",
                        thumbnailFile: null,
                      })
                    }
                    className={addBtnClass}
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
                {(newStore.socialTimeline || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <input
                      type="text"
                      className={fieldClass}
                      placeholder="Media URL (FB, IG, YouTube…)"
                      value={item.media}
                      onChange={(e) =>
                        updateListField("socialTimeline", idx, "media", e.target.value)
                      }
                    />
                    <input
                      type="text"
                      className={fieldClass}
                      placeholder="Post Text"
                      value={item.text}
                      onChange={(e) =>
                        updateListField("socialTimeline", idx, "text", e.target.value)
                      }
                    />
                    <input
                      type="datetime-local"
                      className={fieldClass}
                      value={item.postedOn}
                      onChange={(e) =>
                        updateListField("socialTimeline", idx, "postedOn", e.target.value)
                      }
                    />
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">
                        Thumbnail
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "social_thumbnail", idx)}
                        className={fileInputClass}
                      />
                      {item.thumbnailPreview ? (
                        <img
                          src={item.thumbnailPreview}
                          className="mt-2 w-24 h-24 rounded-lg object-cover border"
                          alt=""
                        />
                      ) : item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          className="mt-2 w-24 h-24 rounded-lg object-cover border"
                          alt=""
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </section>

              <section className={sectionClass}>
                <h3 className="text-sm font-semibold text-gray-900">Customer Images</h3>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "customer_images")}
                  className={fileInputClass}
                />
                <div className="flex flex-wrap gap-2 mt-1">
                  {customerImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                        alt={`Customer ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("customer_images", index)}
                        className="absolute -top-1.5 -right-1.5 bg-[#ED1C24] text-white rounded-full p-1 text-xs"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-6 pt-5 border-t border-gray-100">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Previous
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] text-white text-sm font-semibold shadow-sm transition"
                >
                  Next step
                </button>
              )}
              {currentStep === 4 && (
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition"
                >
                  {submitButtonText}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
