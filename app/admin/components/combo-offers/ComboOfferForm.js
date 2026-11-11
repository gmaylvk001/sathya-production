"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { calculateComboPricing } from "@/lib/comboOffers/pricingEngine";
import { comboImagePublicUrl } from "@/lib/comboOffers/imagePaths";

const emptyForm = {
  purpose: "",
  brandName: "Sathya",
  companyLogo: "",
  productIds: [],
  name: "",
  shortDescription: "",
  longDescription: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  highlights: [],
  keyBenefits: [],
  whyBuy: "",
  tagline: "",
  offerTitle: "",
  ctaContent: "",
  socialCaption: "",
  marketingImage: "",
  originalPrice: 0,
  discountPercent: 10,
  offerPrice: 0,
  savingsAmount: 0,
  startDate: "",
  endDate: "",
  comboStock: 50,
  status: "active",
};

function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ComboOfferForm({ comboId = null }) {
  const router = useRouter();
  const imageInputRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPreview, setLocalPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(comboId));

  const setField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const imagePreviewSrc =
    localPreview || comboImagePublicUrl(form.marketingImage);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    if (!comboId) return;
    (async () => {
      try {
        const res = await fetch(`/api/combo-offers/${comboId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        const c = json.data;
        setForm({
          ...emptyForm,
          purpose: c.purpose || "",
          brandName: c.brandName || "",
          companyLogo: c.companyLogo || "",
          productIds: (c.productIds || []).map((p) => p._id || p),
          name: c.name || "",
          shortDescription: c.shortDescription || "",
          longDescription: String(c.longDescription || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
          metaTitle: c.metaTitle || "",
          metaDescription: c.metaDescription || "",
          metaKeywords: c.metaKeywords || "",
          highlights: c.highlights || [],
          keyBenefits: c.keyBenefits || [],
          whyBuy: c.whyBuy || "",
          tagline: c.tagline || "",
          offerTitle: c.offerTitle || "",
          ctaContent: c.ctaContent || "",
          socialCaption: c.socialCaption || "",
          marketingImage: c.marketingImage || "",
          originalPrice: c.originalPrice || 0,
          discountPercent: c.discountPercent || 0,
          offerPrice: c.offerPrice || 0,
          savingsAmount: c.savingsAmount || 0,
          startDate: toDatetimeLocal(c.startDate),
          endDate: toDatetimeLocal(c.endDate),
          comboStock: c.comboStock ?? 0,
          status: c.status || "active",
        });
        setSelectedProducts(
          (c.productIds || []).filter((p) => typeof p === "object")
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [comboId]);

  useEffect(() => {
    if (searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/product/search?q=${encodeURIComponent(searchQ.trim())}`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addProduct = (product) => {
    if (selectedProducts.some((p) => String(p._id) === String(product._id))) {
      return;
    }
    const next = [...selectedProducts, product];
    setSelectedProducts(next);
    setForm((prev) => ({
      ...prev,
      productIds: next.map((p) => p._id),
      ...calculateComboPricing(next, prev.discountPercent),
    }));
    setSearchQ("");
    setSearchResults([]);
  };

  const removeProduct = (id) => {
    const next = selectedProducts.filter((p) => String(p._id) !== String(id));
    setSelectedProducts(next);
    setForm((prev) => ({
      ...prev,
      productIds: next.map((p) => p._id),
      ...calculateComboPricing(next, prev.discountPercent),
    }));
  };

  const onDiscountChange = (value) => {
    const pct = Number(value) || 0;
    setForm((prev) => ({
      ...prev,
      discountPercent: pct,
      ...calculateComboPricing(selectedProducts, pct),
    }));
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    fd.append("action", "logo");
    const res = await fetch("/api/combo-offers/upload", {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (json.success) setField("companyLogo", json.data.companyLogo);
    else setError(json.error || "Logo upload failed");
  };

  const uploadMarketingImage = async (file) => {
    if (!file) return;
    setError("");
    setUploadingImage(true);
    if (localPreview) URL.revokeObjectURL(localPreview);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    try {
      const fd = new FormData();
      fd.append("action", "marketing-image");
      fd.append("image", file);
      const res = await fetch("/api/combo-offers/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Image upload failed");
      setField("marketingImage", json.data.marketingImage);
      setMessage(
        "Product image uploaded. Save the combo to apply it on the storefront."
      );
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (e) {
      setError(e.message);
      setLocalPreview("");
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploadingImage(false);
    }
  };

  const generateWithAI = async () => {
    setError("");
    setMessage("");
    if (selectedProducts.length < 2) {
      setError("Select at least 2 products");
      return;
    }
    if (!form.purpose.trim()) {
      setError("Enter what this combo offer is for");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/combo-offers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts.map((p) => p._id),
          purpose: form.purpose,
          brandName: form.brandName,
          companyLogo: form.companyLogo,
          discountPercent: form.discountPercent,
          generateImage: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Generation failed");
      const d = json.data;
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview("");
      }
      setForm((prev) => ({
        ...prev,
        name: d.name || prev.name,
        shortDescription: d.shortDescription || "",
        longDescription: String(d.longDescription || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        metaTitle: d.metaTitle || "",
        metaDescription: d.metaDescription || "",
        metaKeywords: d.metaKeywords || "",
        highlights: d.highlights || [],
        keyBenefits: d.keyBenefits || [],
        whyBuy: d.whyBuy || "",
        tagline: d.tagline || "",
        offerTitle: d.offerTitle || "",
        ctaContent: d.ctaContent || "",
        socialCaption: d.socialCaption || "",
        marketingImage: d.marketingImage || prev.marketingImage,
        originalPrice: d.originalPrice ?? prev.originalPrice,
        offerPrice: d.offerPrice ?? prev.offerPrice,
        savingsAmount: d.savingsAmount ?? prev.savingsAmount,
        discountPercent: d.discountPercent ?? prev.discountPercent,
      }));
      setMessage(
        d._source === "openai"
          ? "AI generated product content + image. Review or edit before saving."
          : "Content + image generated. Review or edit before saving. You can also upload an image manually."
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateImage = async () => {
    setError("");
    const fd = new FormData();
    fd.append("action", "regenerate-image");
    fd.append("productIds", JSON.stringify(selectedProducts.map((p) => p._id)));
    fd.append("offerTitle", form.offerTitle || form.name);
    fd.append("purpose", form.purpose);
    fd.append("brandName", form.brandName);
    fd.append("companyLogo", form.companyLogo);
    const res = await fetch("/api/combo-offers/upload", {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (json.success) {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview("");
      }
      setField("marketingImage", json.data.marketingImage);
      setMessage("Marketing image regenerated");
    } else setError(json.error || "Image regenerate failed");
  };

  const save = async (asDraft = false) => {
    setError("");
    setMessage("");
    if (selectedProducts.length < 2) {
      setError("Select at least 2 products");
      return;
    }
    if (!form.name.trim()) {
      setError(
        "Combo product name is required — generate with AI or enter manually"
      );
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Start and end dates are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        productIds: selectedProducts.map((p) => p._id),
        publish: !asDraft,
        status: asDraft ? "draft" : form.status || "active",
      };
      const url = comboId ? `/api/combo-offers/${comboId}` : "/api/combo-offers";
      const method = comboId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setMessage(
        "Combo offer saved. Product created under Combo Offers category."
      );
      router.push("/admin/combo-offers");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/combo-offers"
            className="text-sm text-[#d72828] hover:underline inline-flex items-center gap-1"
          >
            <Icon icon="mdi:arrow-left" width={16} />
            Back to Combo Offers
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            {comboId ? "Edit Combo Offer" : "Create Combo Offer"}
          </h1>
        </div>
      </div>

      {error ? (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2">
          {message}
        </div>
      ) : null}

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-1">1. Select Products</h2>
        <p className="text-sm text-gray-500 mb-4">
          Minimum 2 products (3 recommended). Search and add existing catalog products.
        </p>
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search by name or item code…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        {searchResults.length > 0 ? (
          <ul className="mt-2 border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto">
            {searchResults.map((p) => (
              <li key={p._id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2"
                >
                  <span>{p.name}</span>
                  <span className="text-gray-500 whitespace-nowrap">
                    ₹{p.special_price || p.price}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 grid gap-2">
          {selectedProducts.map((p, idx) => (
            <div
              key={p._id}
              className="flex items-center gap-3 border border-gray-100 rounded-md p-2 bg-gray-50"
            >
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/uploads/products/${p.images[0]}`}
                  alt=""
                  className="w-12 h-12 object-contain bg-white rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  Product {idx + 1}: {p.name}
                </div>
                <div className="text-xs text-gray-500">
                  ₹{p.special_price || p.price}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeProduct(p._id)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">2. Combo Purpose & Branding</h2>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What is this combo offer for?
        </label>
        <textarea
          value={form.purpose}
          onChange={(e) => setField("purpose", e.target.value)}
          rows={3}
          placeholder="e.g. Back to School Offer, Gaming Setup, Independence Day Sale…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
        />
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              value={form.brandName}
              onChange={(e) => setField("brandName", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadLogo(e.target.files?.[0])}
              className="w-full text-sm"
            />
            {form.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.companyLogo}
                alt="Logo"
                className="mt-2 h-12 object-contain"
              />
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={generateWithAI}
          disabled={generating}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          <Icon icon="mdi:auto-fix" width={18} />
          {generating ? "Generating…" : "Generate with AI (content + image)"}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Optional. AI fills product name, description, SEO, highlights, and image.
          Or skip and enter everything manually below — including the image.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-1">3. Product Details</h2>
        <p className="text-sm text-gray-500 mb-4">
          Same fields as Add Product. Fill manually or use Generate with AI above.
        </p>
        <div className="grid gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.longDescription}
              onChange={(e) => setField("longDescription", e.target.value)}
              rows={6}
              placeholder="Plain text description (no HTML)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Meta Title
            </label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => setField("metaTitle", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Meta Keywords
            </label>
            <input
              type="text"
              value={form.metaKeywords}
              onChange={(e) => setField("metaKeywords", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Meta Description
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => setField("metaDescription", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Product Highlights (one per line)
            </label>
            <textarea
              value={(form.highlights || []).join("\n")}
              onChange={(e) =>
                setField(
                  "highlights",
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900">4. Product Image</h2>
            <p className="text-sm text-gray-500">
              Upload manually, or use AI Generate / Regenerate. Preview shows next to the input.
            </p>
          </div>
          <button
            type="button"
            onClick={regenerateImage}
            className="text-sm text-indigo-600 hover:underline"
          >
            Regenerate with AI
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              onChange={(e) => uploadMarketingImage(e.target.files?.[0])}
              className="w-full text-sm"
            />
            <p className="text-sm text-gray-500 mt-2">
              {uploadingImage
                ? "Uploading…"
                : form.marketingImage
                  ? `Saved: ${form.marketingImage}`
                  : "No image yet. Upload a file or click Generate with AI."}
            </p>
          </div>
          {imagePreviewSrc ? (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewSrc}
                alt="Combo product preview"
                className="w-28 h-28 object-contain rounded border border-gray-200 bg-gray-50"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.jpg";
                }}
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
              No preview
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">5. Pricing</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Original Price</label>
            <div className="text-lg font-semibold">₹{form.originalPrice}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) => onDiscountChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Final Combo Price</label>
            <div className="text-lg font-semibold text-green-700">
              ₹{form.offerPrice}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Savings</label>
            <div className="text-lg font-semibold text-amber-700">
              ₹{form.savingsAmount}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          6. Offer Duration & Stock
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setField("endDate", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Combo Stock</label>
            <input
              type="number"
              min={0}
              value={form.comboStock}
              onChange={(e) => setField("comboStock", Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Before start: hidden · During window: active · After end: auto-expired.
          Stock 0 → Out of Stock. Empty Combo Offers category is hidden from navigation
          automatically.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 pb-10">
        <button
          type="button"
          disabled={saving || uploadingImage}
          onClick={() => save(false)}
          className="px-5 py-2.5 bg-[#d72828] text-white text-sm font-medium rounded-md hover:bg-[#d72828] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Combo Offer"}
        </button>
        <button
          type="button"
          disabled={saving || uploadingImage}
          onClick={() => save(true)}
          className="px-5 py-2.5 border border-gray-300 bg-white text-sm rounded-md hover:bg-gray-50"
        >
          Save as Draft
        </button>
        <Link
          href="/admin/combo-offers"
          className="px-5 py-2.5 text-sm text-gray-600 hover:underline self-center"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
