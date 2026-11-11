"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new").then((mod) => mod.default), { ssr: false });

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

export default function EditLaunchProduct({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [formData, setFormData] = useState({
    title: "",
    status: "draft",
    seo_title: "",
    seo_description: "",

    stock_status: "pre_book",
  });
  
  const [content, setContent] = useState({
    description: "",
    highlights: "",
    features: "",
    in_the_box: "",
  });

  const [currentDesktopImages, setCurrentDesktopImages] = useState([]);
  const [currentMobileImages, setCurrentMobileImages] = useState([]);
  const [currentPrebookImage, setCurrentPrebookImage] = useState("");
  
  const [desktopImages, setDesktopImages] = useState([]);
  const [mobileImages, setMobileImages] = useState([]);
  const [prebookModalImage, setPrebookModalImage] = useState(null);
  
  const [deletedDesktopImages, setDeletedDesktopImages] = useState([]);
  const [deletedMobileImages, setDeletedMobileImages] = useState([]);
  const [isPrebookImageDeleted, setIsPrebookImageDeleted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const modalInputRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/admin/design/new-product-launch/${id}`);
        const data = await res.json();
        if (data.success || data.code === 200) {
          const prod = data.data || data.launchProduct;
          setFormData({
            title: prod.title || prod.product_name || "",
            status: prod.status || "draft",
            seo_title: prod.seo_title || "",
            seo_description: prod.seo_description || "",

            stock_status: prod.stock_status || "pre_book",
          });
          setContent({
            description: prod.description || "",
            highlights: prod.highlights || "",
            features: prod.features || "",
            in_the_box: prod.in_the_box || "",
          });
          setCurrentDesktopImages((prod.desktop_images || []).map(img => typeof img === 'string' ? img : img.url));
          setCurrentMobileImages((prod.mobile_images || []).map(img => typeof img === 'string' ? img : img.url));
          setCurrentPrebookImage(prod.prebook_modal_image || "");
        } else {
          toast.error("Failed to load product");
          router.push("/admin/design/new-product-launch");
        }
      } catch (err) {
        toast.error("Error fetching product");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuillChange = (name, value) => {
    setContent((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddFiles = (ref, setter) => {
    if (ref.current && ref.current.files.length > 0) {
      const filesArray = Array.from(ref.current.files);
      setter((prev) => [...prev, ...filesArray]);
      ref.current.value = "";
    }
  };

  const removeImage = (index, setter) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const removeCurrentDesktopImage = (url) => {
    setDeletedDesktopImages((prev) => [...prev, url]);
    setCurrentDesktopImages((prev) => prev.filter((img) => img !== url));
  };

  const removeCurrentMobileImage = (url) => {
    setDeletedMobileImages((prev) => [...prev, url]);
    setCurrentMobileImages((prev) => prev.filter((img) => img !== url));
  };

  const removeCurrentPrebookImage = () => {
    setIsPrebookImageDeleted(true);
    setCurrentPrebookImage("");
  };

  const getSafeObjectUrl = (file) => {
    if (!file) return "";
    try { return URL.createObjectURL(file); } catch (e) { return ""; }
  };

  const handleSubmit = async (e, forceStatus) => {
    e.preventDefault();

    if (forceStatus === "published") {
      if (!formData.title) {
        return toast.error("Product Title is required to publish");
      }
      if (currentDesktopImages.length === 0 && desktopImages.length === 0) {
        return toast.error("At least one Desktop Image is required to publish");
      }
      if (!content.description || content.description === "<p><br></p>") {
        return toast.error("Description is required to publish");
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Updating product...");

    try {
      const form = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "status" && forceStatus) {
          form.append(key, forceStatus);
        } else {
          form.append(key, formData[key]);
        }
      });
      Object.keys(content).forEach((key) => form.append(key, content[key]));
      
      desktopImages.forEach((img) => form.append("desktop_images", img));
      mobileImages.forEach((img) => form.append("mobile_images", img));
      if (prebookModalImage) form.append("prebook_modal_image", prebookModalImage);
      
      deletedDesktopImages.forEach((url) => form.append("delete_desktop_images", url));
      deletedMobileImages.forEach((url) => form.append("delete_mobile_images", url));
      if (isPrebookImageDeleted) form.append("delete_prebook_image", "true");

      const res = await fetch(`/api/admin/design/new-product-launch/${id}`, {
        method: "PUT",
        body: form,
      });

      const data = await res.json();
      if (data.success || data.code === 200) {
        toast.update(toastId, { render: "Launch product updated successfully!", type: "success", isLoading: false, autoClose: 3000 });
        router.push("/admin/design/new-product-launch");
      } else {
        toast.update(toastId, { render: data.details || data.message || "Failed to update", type: "error", isLoading: false, autoClose: 4000 });
      }
    } catch (err) {
      toast.update(toastId, { render: "An error occurred during update", type: "error", isLoading: false, autoClose: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Icon icon="eos-icons:loading" className="w-8 h-8 text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/admin/design/new-product-launch" className="hover:text-slate-800 transition-colors">Products</Link>
              <Icon icon="ph:caret-right-bold" className="w-3 h-3" />
              <span className="font-medium text-slate-800">Edit Launch</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{formData.title || "Edit Product"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/design/new-product-launch"
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all focus:ring-2 focus:ring-slate-200 focus:outline-none"
            >
              Cancel
            </Link>
            <button
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors focus:ring-2 focus:ring-slate-300 focus:outline-none disabled:opacity-50"
            >
              Set Draft
            </button>
            <button
              onClick={(e) => handleSubmit(e, "published")}
              disabled={isSubmitting || !formData.title}
              className="px-5 py-2 bg-[#D7191F] text-white rounded-lg text-sm font-medium hover:bg-[#B91419] shadow-[0_8px_20px_rgba(215,25,31,.25)] transition-all focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Icon icon="eos-icons:loading" className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (Left Column) */}
          <div className="flex-1 space-y-6">
            
            {/* Basic Info Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                <Icon icon="ph:info-bold" className="text-slate-400" /> Basic Information
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    required
                  />
                </div>

              </div>
            </div>

            {/* Media Upload Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                <Icon icon="ph:image-bold" className="text-slate-400" /> Media Gallery
              </h2>
              <div className="space-y-6">
                
                {/* Desktop Images */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Desktop Images</label>
                  
                  {currentDesktopImages.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Existing</div>
                      <div className="flex flex-wrap gap-3">
                        {currentDesktopImages.map((url, i) => (
                          <div key={i} className="group relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <img src={url} alt="" className="w-full h-full object-contain p-1" />
                            <button type="button" onClick={() => removeCurrentDesktopImage(url)} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm">
                              <Icon icon="ph:trash-bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 hover:border-slate-300 relative group cursor-pointer">
                    <input type="file" multiple ref={desktopInputRef} onChange={() => handleAddFiles(desktopInputRef, setDesktopImages)} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-3 group-hover:scale-105 transition-transform">
                      <Icon icon="ph:upload-simple-bold" className="text-slate-500 w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Click to upload desktop images</p>
                  </div>
                  
                  {desktopImages.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {desktopImages.map((file, i) => (
                        <div key={i} className="group relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                          <img src={getSafeObjectUrl(file)} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(i, setDesktopImages)} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm">
                            <Icon icon="ph:trash-bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* Mobile Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Mobile Images / Banner</label>
                    <span className="text-xs text-slate-400">Optional</span>
                  </div>
                  
                  {currentMobileImages.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Existing</div>
                      <div className="flex flex-wrap gap-3">
                        {currentMobileImages.map((url, i) => (
                          <div key={i} className="group relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <img src={url} alt="" className="w-full h-full object-contain p-1" />
                            <button type="button" onClick={() => removeCurrentMobileImage(url)} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm">
                              <Icon icon="ph:trash-bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 hover:border-slate-300 relative group cursor-pointer">
                    <input type="file" multiple ref={mobileInputRef} onChange={() => handleAddFiles(mobileInputRef, setMobileImages)} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-3 group-hover:scale-105 transition-transform">
                      <Icon icon="ph:upload-simple-bold" className="text-slate-500 w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Click to upload mobile images</p>
                  </div>
                  
                  {mobileImages.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {mobileImages.map((file, i) => (
                        <div key={i} className="group relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                          <img src={getSafeObjectUrl(file)} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(i, setMobileImages)} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm">
                            <Icon icon="ph:trash-bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* Pre-book Modal Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pre-Book Modal Image</label>
                  <div className="flex gap-4">
                    {(currentPrebookImage || prebookModalImage) && (
                      <div className="relative w-32 h-40 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm shrink-0 group">
                        <img src={prebookModalImage ? getSafeObjectUrl(prebookModalImage) : currentPrebookImage} alt="Modal" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            if (prebookModalImage) {
                              setPrebookModalImage(null);
                              if(modalInputRef.current) modalInputRef.current.value = "";
                            } else {
                              removeCurrentPrebookImage();
                            }
                          }}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium backdrop-blur-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="border border-slate-200 rounded-lg bg-slate-50 flex overflow-hidden">
                        <input
                          type="file"
                          ref={modalInputRef}
                          accept="image/*"
                          onChange={(e) => { if (e.target.files[0]) setPrebookModalImage(e.target.files[0]); }}
                          className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:border-0 file:border-r file:border-slate-200 file:text-sm file:font-medium file:bg-white hover:file:bg-slate-50 file:cursor-pointer cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Recommended: 800x1000px (4:5 ratio). Used for the right-side banner in the enquiry modal.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Rich Content Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                <Icon icon="ph:text-align-left-bold" className="text-slate-400" /> Product Content
              </h2>
              <div className="space-y-6">
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Description Overview</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-slate-700">
                    <ReactQuill modules={quillModules} theme="snow" value={content.description} onChange={(val) => handleQuillChange("description", val)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Highlights</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-slate-700">
                    <ReactQuill modules={quillModules} theme="snow" value={content.highlights} onChange={(val) => handleQuillChange("highlights", val)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Features</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-slate-700">
                    <ReactQuill modules={quillModules} theme="snow" value={content.features} onChange={(val) => handleQuillChange("features", val)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">In The Box</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-slate-700">
                    <ReactQuill modules={quillModules} theme="snow" value={content.in_the_box} onChange={(val) => handleQuillChange("in_the_box", val)} />
                  </div>
                </div>

              </div>
            </div>
            
            {/* SEO Settings */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                <Icon icon="ph:magnifying-glass-bold" className="text-slate-400" /> Search Engine Optimization
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Meta Title</label>
                  <input
                    type="text"
                    name="seo_title"
                    value={formData.seo_title}
                    onChange={handleChange}
                    placeholder="Optimize title for search..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Meta Description</label>
                  <textarea
                    name="seo_description"
                    value={formData.seo_description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description for search results..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar (Right Column) */}
          <div className="w-full lg:w-[320px] space-y-6 shrink-0">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-6">
              <h3 className="font-semibold text-slate-800 mb-4">Publishing & Status</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stock Availability</label>
                  <div className="relative">
                    <select
                      name="stock_status"
                      value={formData.stock_status}
                      onChange={handleChange}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    >
                      <option value="pre_book">Pre-Book</option>
                      <option value="in_stock">In Stock</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <Icon icon="ph:caret-down-bold" className="absolute right-3 top-3 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Readiness</span>
                    <span className="font-medium text-slate-700">
                      {Object.values(formData).filter(Boolean).length + Object.values(content).filter(Boolean).length > 3 ? "High" : "Low"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: formData.title ? '75%' : '20%' }}></div>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
