"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { getDiscountInfo } from "@/lib/discountHelper";
import { useRegion } from "@/context/RegionContext";
import { useFilteredStores } from "@/hooks/useFilteredStores";

export default function ProductDetailClient({ product }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState("description"); // description, specifications, inTheBox
  const [showPreBookModal, setShowPreBookModal] = useState(false);
  const [preBookForm, setPreBookForm] = useState({ name: '', email: '', mobile: '', store: '', product: product.name });
  const [formErrors, setFormErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ loading: false, message: '', success: false });
  const [storesList, setStoresList] = useState([]);
  const { district: userDistrict, city: userCity } = useRegion();
  const activeDistrict = userDistrict || userCity || '';
  const { filteredStores: filteredStoresList, isFallback, fallbackMessage } = useFilteredStores(storesList, activeDistrict);

  const validateField = (field, value) => {
    let error = "";
    if (field === "name") {
      if (!value.trim()) error = "Name is required";
    } else if (field === "email") {
      if (!value) error = "Email is required";
      else if (!/^\S+@\S+\.\S+$/.test(value)) error = "Invalid email format";
    } else if (field === "mobile") {
      if (!value) error = "Mobile number is required";
      else if (!/^[0-9]{10}$/.test(value)) error = "Must be 10 digits";
    } else if (field === "store") {
      if (!value) error = "Please select a store";
    }
    setFormErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPreBookForm(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/store_listings/get');
        if (res.ok) {
          const data = await res.json();
          const sortedStores = (data || []).sort((a, b) => {
            const nameA = (a.title || a.branch || a.name || "").toLowerCase();
            const nameB = (b.title || b.branch || b.name || "").toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setStoresList(sortedStores);
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      }
    };
    fetchStores();
  }, []);

  const validateForm = () => {
    const isNameValid = validateField('name', preBookForm.name);
    const isEmailValid = validateField('email', preBookForm.email);
    const isMobileValid = validateField('mobile', preBookForm.mobile);
    const isStoreValid = validateField('store', preBookForm.store);
    return isNameValid && isEmailValid && isMobileValid && isStoreValid;
  };

  const handlePreBookSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitStatus({ loading: true, message: '', success: false });
    try {
      const res = await fetch('/api/pre-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: (() => {
          let utm_source = '';
          let utm_campaign = '';
          let referrel_url = '';
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            utm_source = params.get('utm_source') || params.get('source') || '';
            utm_campaign = params.get('utm_campaign') || params.get('campaign') || '';
            referrel_url = window.location.href;
          }
          return JSON.stringify({
            name: preBookForm.name,
            email: preBookForm.email,
            mobile: preBookForm.mobile,
            store_id: preBookForm.store,
            product_name: preBookForm.product,
            utm_source,
            utm_campaign,
            referrel_url,
          });
        })()
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ loading: false, message: 'Enquiry submitted successfully!', success: true });
        setPreBookForm({ name: '', email: '', mobile: '', store: '', product: product.name });
        setTimeout(() => {
          setShowPreBookModal(false);
          setSubmitStatus({ loading: false, message: '', success: false });
        }, 2000);
      } else {
        setSubmitStatus({ loading: false, message: data.message || 'Error submitting form.', success: false });
      }
    } catch (err) {
      setSubmitStatus({ loading: false, message: 'Server error. Please try again.', success: false });
    }
  };

  // Extract images safely
  const images = product.images && product.images.length > 0 ? product.images : ["/no-image.jpg"];
  const currentImage = images[activeImageIndex];

  // Derive state strings
  const availabilityStatus = product.stock === "in_stock"
    ? "In Stock"
    : product.stock === "pre_book" ? "Pre-Book"
      : product.stock === "coming_soon" ? "Coming Soon"
        : "Out of Stock";

  const isAvailable = product.stock === "in_stock" || product.stock === "pre_book";

  const renderCTAButton = () => {
    if (product.stock === "pre_book") {
      return (
        <button onClick={() => setShowPreBookModal(true)} className="w-full bg-[#D7191F] text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition shadow-lg hover:shadow-red-500/30 transform hover:-translate-y-0.5">
          Pre-Book Now
        </button>
      );
    }
    if (product.stock === "in_stock") {
      return (
        <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg transform hover:-translate-y-0.5">
          Buy Now
        </button>
      );
    }
    if (product.stock === "coming_soon") {
      return (
        <button className="w-full bg-slate-200 text-slate-800 py-4 rounded-xl font-bold text-lg cursor-not-allowed">
          Coming Soon
        </button>
      );
    }
    return (
      <button className="w-full bg-slate-200 text-slate-500 py-4 rounded-xl font-bold text-lg cursor-not-allowed">
        Out of Stock
      </button>
    );
  };

  return (
    <div className="bg-[#FAFAFA] min-h-screen font-sans text-slate-900 pb-24 md:pb-0">

      {/* Breadcrumb - Dynamic Category parsing could be added here if available */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center text-sm text-slate-500 gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <a href="/" className="hover:text-slate-900 transition-colors">Home</a>
          <Icon icon="ph:caret-right" />
          <span className="text-slate-900 font-medium">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 lg:gap-12">

          {/* Left Column: Image Gallery (70%) */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4 h-fit sticky top-24">

            {/* Main Image Viewer */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group aspect-square md:aspect-[4/3] flex items-center justify-center p-8">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-500 ease-out"
                style={{ transform: isZoomed ? "scale(1.5)" : "scale(1)", cursor: isZoomed ? "zoom-out" : "zoom-in" }}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              {/* Image Navigation Arrows for Mobile */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1)); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Icon icon="ph:caret-left-bold" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0)); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Icon icon="ph:caret-right-bold" />
                  </button>
                </>
              )}

            </div>
          </div>

          {/* Right Column: Product Details & Purchase Panel (30%) */}
          <div className="lg:col-span-3 space-y-8">

            <div className="space-y-4">
              {product.brand && (
                <div className="text-[#D7191F] font-bold tracking-widest uppercase text-xs">
                  {product.brand}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-slate-900">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {product.rating && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-md border border-yellow-200">
                    <Icon icon="ph:star-fill" className="text-yellow-500" />
                    <span className="font-semibold text-yellow-700">{product.rating}</span>
                    {product.reviewCount && <span className="text-yellow-600/80">({product.reviewCount})</span>}
                  </div>
                )}

                {product.stock && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-green-500" : "bg-red-500"}`}></span>
                    <span className={isAvailable ? "text-green-700" : "text-red-700"}>{availabilityStatus}</span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Price Section */}
            <div className="space-y-2">
              {product.price ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {product.currency || "₹"}{product.price.toLocaleString("en-IN")}
                  </span>
                  {(() => {
                    const { discountPercent, showDiscount } = getDiscountInfo(product.mrp, product.price);
                    return showDiscount ? (
                      <>
                        <span className="text-lg text-slate-400 line-through decoration-slate-300">
                          {product.currency || "₹"}{product.mrp.toLocaleString("en-IN")}
                        </span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded text-sm">
                          {discountPercent}% OFF
                        </span>
                      </>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="text-2xl font-semibold text-slate-800">Price on Request</div>
              )}

              {product.emiStartingPrice && (
                <p className="text-slate-600 font-medium flex items-center gap-2">
                  <Icon icon="ph:credit-card" className="text-slate-400" />
                  EMI starts at <span className="font-bold text-slate-900">{product.currency || "₹"}{product.emiStartingPrice.toLocaleString("en-IN")}/mo</span>
                </p>
              )}
            </div>

            {/* Variants Selector - Dynamic mapping */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4 pt-2">
                {product.variants.map((variantGroup, idx) => (
                  <div key={idx}>
                    <div className="text-sm font-semibold text-slate-900 mb-2">{variantGroup.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {variantGroup.options.map((opt, i) => (
                        <button key={i} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${i === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Offers Section */}
            {product.offers && product.offers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <Icon icon="ph:tag-bold" className="text-[#D7191F]" /> Available Offers
                </div>
                <ul className="space-y-3">
                  {product.offers.map((offer, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <Icon icon="ph:check-circle-fill" className="text-green-500 shrink-0 mt-0.5" />
                      <span className="text-slate-700">{offer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Desktop CTA Action */}
            <div className="hidden md:block pt-4">
              {renderCTAButton()}
              {/* Highlights below CTA */}
              {product.highlights && (
                <div className="mt-6 border-t border-slate-200 pt-4 overflow-hidden">
                  <h4 className="font-bold text-slate-900 mb-2">Highlights</h4>
                  <div className="text-sm text-slate-600 break-words whitespace-normal [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_li]:break-words" dangerouslySetInnerHTML={{ __html: product.highlights }} />
                </div>
              )}
              {/* Delivery / Warranty Info */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-600">
                {product.delivery && (
                  <div className="flex items-start gap-2">
                    <Icon icon="ph:truck" className="w-5 h-5 shrink-0 text-slate-400" />
                    <span>{product.delivery}</span>
                  </div>
                )}
                {product.warranty && product.warranty.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Icon icon="ph:shield-check" className="w-5 h-5 shrink-0 text-slate-400" />
                    <span>{product.warranty[0].value}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Extended Product Content / Highlights */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Main Extended Details */}
          <div className="lg:col-span-12 space-y-12">

            {/* Stacked Content Area (Overview, Features, Highlights, In Box) */}
            <div className="w-full space-y-12">
              {product.description && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4 border-slate-100">Overview</h2>
                  <div className="w-full break-words text-slate-700 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li]:break-words [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3" dangerouslySetInnerHTML={{ __html: product.description }} />
                </div>
              )}
              {product.features && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4 border-slate-100">Features</h2>
                  <div className="w-full break-words text-slate-700 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li]:break-words [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3" dangerouslySetInnerHTML={{ __html: product.features }} />
                </div>
              )}
              {product.highlights && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4 border-slate-100">Highlights</h2>
                  <div className="w-full break-words text-slate-700 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li]:break-words [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3" dangerouslySetInnerHTML={{ __html: product.highlights }} />
                </div>
              )}
              {product.inTheBox && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4 border-slate-100">Openbox</h2>
                  <div className="w-full break-words text-slate-700 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li]:break-words [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3" dangerouslySetInnerHTML={{ __html: product.inTheBox }} />
                </div>
              )}
            </div>

          </div>

          {/* Bottom Specifications & Warranty */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Dynamic Specifications */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Specifications</h3>
                <div className="space-y-6">
                  {product.specifications.map((specGroup, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{specGroup.group}</h4>
                      <dl className="space-y-3">
                        {specGroup.items.map((item, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0">
                            <dt className="text-sm text-slate-600 font-medium">{item.label}</dt>
                            <dd className="text-sm text-slate-900 sm:text-right font-medium">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warranty Info */}
            {product.warranty && product.warranty.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Icon icon="ph:shield-check-bold" className="text-green-600" /> Warranty
                </h3>
                <ul className="space-y-3">
                  {product.warranty.map((w, i) => (
                    <li key={i} className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{w.label}</span>
                      <span className="text-sm text-slate-600">{w.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Global Sticky Bottom Banner */}
      <div className="fixed bottom-0 left-0 w-full bg-[#f4f4f4] border-t border-slate-200 py-3 px-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 flex items-center justify-center gap-4 flex-col sm:flex-row">
        <span className="text-slate-900 font-semibold text-sm sm:text-base text-center">
          Don't miss out - Grab yours now before we sell out again!
        </span>
        <button onClick={() => setShowPreBookModal(true)} className="bg-[#21d375] hover:bg-[#1db966] text-white px-8 py-2.5 rounded-full font-bold text-sm sm:text-base transition-colors shadow-md">
          Pre Order
        </button>
      </div>

      {/* Pre-Book Modal */}
      {showPreBookModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden relative flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left side Form */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <div className="text-xs font-bold text-[#D7191F] tracking-widest uppercase mb-2">Sathya Store</div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Pre-Book Enquiry</h2>
              <p className="text-slate-600 mb-8 text-sm">
                Share your details and our team will help you reserve {product.name}.
              </p>
              
              <form onSubmit={handlePreBookSubmit} className="space-y-4">
                <div>
                  <input type="text" name="name" required placeholder="Name" className={`w-full px-4 py-3 rounded-xl border ${formErrors.name ? 'border-red-500' : preBookForm.name ? 'border-green-500' : 'border-slate-200'} focus:outline-none focus:border-[#D7191F] focus:ring-1 focus:ring-[#D7191F] transition-colors`} value={preBookForm.name} onChange={handleInputChange} />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.name}</p>}
                </div>
                <div>
                  <input type="email" name="email" required placeholder="Email" className={`w-full px-4 py-3 rounded-xl border ${formErrors.email ? 'border-red-500' : preBookForm.email ? 'border-green-500' : 'border-slate-200'} focus:outline-none focus:border-[#D7191F] focus:ring-1 focus:ring-[#D7191F] transition-colors`} value={preBookForm.email} onChange={handleInputChange} />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.email}</p>}
                </div>
                <div>
                  <input type="tel" name="mobile" required placeholder="Mobile" pattern="[0-9]{10}" title="Please enter 10 digit mobile number" className={`w-full px-4 py-3 rounded-xl border ${formErrors.mobile ? 'border-red-500' : preBookForm.mobile ? 'border-green-500' : 'border-slate-200'} focus:outline-none focus:border-[#D7191F] focus:ring-1 focus:ring-[#D7191F] transition-colors`} value={preBookForm.mobile} onChange={handleInputChange} />
                  {formErrors.mobile && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.mobile}</p>}
                </div>
                <div>
                  <select name="store" required className={`w-full px-4 py-3 rounded-xl border ${formErrors.store ? 'border-red-500' : preBookForm.store ? 'border-green-500' : 'border-slate-200'} focus:outline-none focus:border-[#D7191F] focus:ring-1 focus:ring-[#D7191F] transition-colors appearance-none bg-white`} value={preBookForm.store} onChange={handleInputChange}>
                    <option value="" disabled>
                      {isFallback && fallbackMessage
                        ? `${fallbackMessage} - Showing all stores`
                        : activeDistrict
                        ? `Select store near you (${activeDistrict.charAt(0).toUpperCase() + activeDistrict.slice(1)})`
                        : "Select store near you"}
                    </option>
                    {filteredStoresList.map(store => (
                      <option key={store._id} value={store._id}>{store.title || store.branch || store.name}</option>
                    ))}
                    <option value="Online">Online Team</option>
                  </select>
                  {formErrors.store && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.store}</p>}
                </div>
                <div>
                  <select name="product" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#D7191F] focus:ring-1 focus:ring-[#D7191F] transition-colors appearance-none bg-white" value={preBookForm.product} onChange={handleInputChange}>
                    <option value={product.name}>{product.name}</option>
                  </select>
                </div>
                
                {submitStatus.message && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${submitStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {submitStatus.message}
                  </div>
                )}
                
                <button type="submit" disabled={submitStatus.loading} className="w-full bg-[#D7191F] text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition shadow-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                  {submitStatus.loading ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </form>
            </div>
            
            {/* Right side Image */}
            <div className="hidden md:block w-5/12 bg-slate-100 relative">
              <button onClick={() => setShowPreBookModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm z-10 transition-colors">
                <Icon icon="ph:x-bold" className="w-4 h-4" />
              </button>
              <img src={currentImage} alt={product.name} className="w-full h-full object-cover mix-blend-multiply opacity-90 p-8" />
            </div>
            
            {/* Mobile close button */}
            <button onClick={() => setShowPreBookModal(false)} className="md:hidden absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-sm z-10">
              <Icon icon="ph:x-bold" className="w-4 h-4" />
            </button>
            
          </div>
        </div>
      )}

    </div>
  );
}
