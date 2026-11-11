"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaTrash, FaArrowLeft } from "react-icons/fa";

function uniqueValues(products, attrName) {
  const seen = [];
  for (const product of products) {
    const value = String(product.values?.[attrName] || "").trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

function productThumb(product) {
  const image = product.images?.[0];
  if (!image) return "/no-image.jpg";
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return `/uploads/products/${image}`;
}

/** Color is the last part of the product name, usually inside (...). Example: Glacier Blue) → Glacier Blue */
function extractColorFromProductName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const paren = raw.match(/\(([^()]*)\)\s*$/);
  if (paren?.[1]) {
    const inner = paren[1].replace(/\)+$/g, "").trim();
    const parts = inner.split(",");
    return (parts[parts.length - 1] || "").trim();
  }
  const stripped = raw.replace(/\)+$/g, "").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  return words[words.length - 1] || "";
}

export default function VariantGroupForm({ groupId = null }) {
  const router = useRouter();
  const isEdit = Boolean(groupId);
  const searchTimer = useRef(null);

  const [name, setName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/variants/${groupId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load group");
      const group = data.data;
      setName(group.name || "");
      setAttributes(
        (group.attributes || []).map((attr) => ({
          name: attr.name,
          type: attr.type === "color" ? "color" : "text",
          options: Array.isArray(attr.options) && attr.options.length
            ? attr.options
            : uniqueValues(group.products || [], attr.name),
          valuesMeta: attr.valuesMeta || [],
        }))
      );
      setSelectedProducts(
        (group.products || []).map((product) => ({
          ...product,
          values: product.values || {},
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const searchProducts = useCallback(
    async (term) => {
      if (term.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: term.trim(), limit: "20" });
        if (groupId) params.set("excludeGroupId", groupId);
        const res = await fetch(`/api/variants/search-products?${params.toString()}`);
        const data = await res.json();
        setResults(data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchProducts(query), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, searchProducts]);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((p) => String(p._id))),
    [selectedProducts]
  );

  const addProduct = (product) => {
    if (product.inOtherGroup) return;
    if (selectedIds.has(String(product._id))) return;
    const values = {};
    attributes.forEach((attr) => {
      values[attr.name] = "";
    });
    setSelectedProducts((prev) => [...prev, { ...product, values }]);
    setQuery("");
    setResults([]);
  };

  const removeProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => String(p._id) !== String(productId)));
  };

  const addAttribute = () => {
    const nextName = `Variant ${attributes.length + 1}`;
    setAttributes((prev) => [...prev, { name: nextName, type: "text", options: [], valuesMeta: [] }]);
    setSelectedProducts((prev) =>
      prev.map((product) => ({
        ...product,
        values: { ...(product.values || {}), [nextName]: "" },
      }))
    );
  };

  const renameAttribute = (index, nextName) => {
    const trimmed = nextName.trim();
    const previous = attributes[index];
    const oldName = previous.name;
    setAttributes((prev) =>
      prev.map((attr, i) => {
        if (i !== index) return attr;
        const type = /color/i.test(trimmed) ? "color" : attr.type;
        return { ...attr, name: trimmed, type };
      })
    );
    if (oldName === trimmed) return;
    setSelectedProducts((prev) =>
      prev.map((product) => {
        const values = { ...(product.values || {}) };
        values[trimmed] = values[oldName] || "";
        delete values[oldName];
        return { ...product, values };
      })
    );
  };

  const setAttributeType = (index, type) => {
    setAttributes((prev) => prev.map((attr, i) => (i === index ? { ...attr, type } : attr)));
  };

  const removeAttribute = (index) => {
    const attrName = attributes[index].name;
    setAttributes((prev) => prev.filter((_, i) => i !== index));
    setSelectedProducts((prev) =>
      prev.map((product) => {
        const values = { ...(product.values || {}) };
        delete values[attrName];
        return { ...product, values };
      })
    );
  };

  const addOption = (attrIndex) => {
    setAttributes((prev) =>
      prev.map((attr, i) => {
        if (i !== attrIndex) return attr;
        return { ...attr, options: [...(attr.options || []), ""] };
      })
    );
  };

  const setOption = (attrIndex, optionIndex, value) => {
    const previous = String(attributes[attrIndex]?.options?.[optionIndex] ?? "");
    setAttributes((prev) =>
      prev.map((attr, i) => {
        if (i !== attrIndex) return attr;
        const options = [...(attr.options || [])];
        options[optionIndex] = value;
        return { ...attr, options };
      })
    );
    if (previous.trim() && previous !== value) {
      const attrName = attributes[attrIndex].name;
      setSelectedProducts((prev) =>
        prev.map((product) =>
          String(product.values?.[attrName] || "") === previous
            ? { ...product, values: { ...(product.values || {}), [attrName]: value } }
            : product
        )
      );
    }
  };

  const removeOption = (attrIndex, optionIndex) => {
    const removed = String(attributes[attrIndex]?.options?.[optionIndex] || "").trim();
    setAttributes((prev) =>
      prev.map((attr, i) => {
        if (i !== attrIndex) return attr;
        return { ...attr, options: (attr.options || []).filter((_, j) => j !== optionIndex) };
      })
    );
    if (!removed) return;
    const attrName = attributes[attrIndex].name;
    setSelectedProducts((prev) =>
      prev.map((product) =>
        String(product.values?.[attrName] || "").trim() === removed
          ? { ...product, values: { ...(product.values || {}), [attrName]: "" } }
          : product
      )
    );
  };

  const fillColorsFromProductNames = () => {
    setError("");
    if (selectedProducts.length === 0) {
      setError("Add products first, then click Color.");
      return;
    }

    const existingColor = attributes.find(
      (attr) => attr.type === "color" || /^color$/i.test(String(attr.name).trim())
    );
    const colorAttrName = existingColor?.name || "Color";
    setAttributes((prev) => {
      const existingIndex = prev.findIndex(
        (attr) => attr.type === "color" || /^color$/i.test(String(attr.name).trim())
      );
      if (existingIndex >= 0) {
        return prev.map((attr, i) => (i === existingIndex ? { ...attr, type: "color" } : attr));
      }
      return [...prev, { name: "Color", type: "color", options: [], valuesMeta: [] }];
    });

    setSelectedProducts((prev) =>
      prev.map((product) => ({
        ...product,
        values: {
          ...(product.values || {}),
          [colorAttrName]: extractColorFromProductName(product.name),
        },
      }))
    );
  };

  const setProductValue = (productId, attrName, value) => {
    setSelectedProducts((prev) =>
      prev.map((product) =>
        String(product._id) === String(productId)
          ? { ...product, values: { ...(product.values || {}), [attrName]: value } }
          : product
      )
    );
  };

  const updateValueMeta = (attrIndex, value, patch) => {
    setAttributes((prev) =>
      prev.map((attr, i) => {
        if (i !== attrIndex) return attr;
        const valuesMeta = [...(attr.valuesMeta || [])];
        const existingIndex = valuesMeta.findIndex((meta) => meta.value === value);
        if (existingIndex >= 0) {
          valuesMeta[existingIndex] = { ...valuesMeta[existingIndex], ...patch };
        } else {
          valuesMeta.push({ value, image: "", colorHex: "", ...patch });
        }
        return { ...attr, valuesMeta };
      })
    );
  };

  const getValueMeta = (attr, value) =>
    (attr.valuesMeta || []).find((meta) => meta.value === value) || {
      value,
      image: "",
      colorHex: "",
    };

  const uploadValueImage = async (attrIndex, value, file) => {
    if (!file) return;
    const key = `${attrIndex}:${value}`;
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/product/upload", { method: "POST", body: formData });
      const data = await res.json();
      const image = data.savedImages?.[0] || "";
      if (image) updateValueMeta(attrIndex, value, { image });
    } catch (err) {
      console.error(err);
      setError("Image upload failed");
    } finally {
      setUploadingKey("");
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const cleanedAttributes = attributes
        .map((attr) => ({
          ...attr,
          name: String(attr.name || "").trim(),
        }))
        .filter((attr) => attr.name);
      const attributeNames = cleanedAttributes.map((attr) => attr.name);

      const payload = {
        name,
        attributes: cleanedAttributes.map((attr) => ({
          name: attr.name,
          type: attr.type === "color" ? "color" : "text",
          options: (attr.options || []).map((option) => String(option || "").trim()).filter(Boolean),
          valuesMeta: uniqueValues(selectedProducts, attr.name).map((value) => {
            const meta = getValueMeta(attr, value);
            return { value, image: meta.image || "", colorHex: meta.colorHex || "" };
          }),
        })),
        products: selectedProducts.map((product) => ({
          productId: product._id,
          values: Object.fromEntries(
            attributeNames.map((name) => [
              name,
              String(product.values?.[name] ?? "").trim(),
            ])
          ),
        })),
      };

      const res = await fetch(isEdit ? `/api/variants/${groupId}` : "/api/variants", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/admin/variants");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-sm text-gray-500">Loading variant group...</p>;
  }

  return (
    <div className="py-6 space-y-5 w-full max-w-full min-w-0">
      <button
        onClick={() => router.push("/admin/variants")}
        className="inline-flex items-center gap-2 text-sm text-red-500"
      >
        <FaArrowLeft /> Back to Variants
      </button>

      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          {isEdit ? "Edit Variant Group" : "Add Variant Group"}
        </h1>
        <p className="text-sm text-gray-500">
          Select existing products and define attributes such as Storage, Color, RAM, Size, etc.
        </p>
      </div>

      {error && (
        <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Variant Group Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="iPhone 17 Pro"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 w-full max-w-full min-w-0">
          <h2 className="font-semibold text-gray-800 mb-2">Select Products</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, item code, brand, category, or slug"
            className="w-1/4 border border-gray-300 rounded px-3 py-2 text-sm mb-3"
          />
          {searching && <p className="text-xs text-gray-500 mb-2">Searching...</p>}
          {results.length > 0 && (
            <div className="border border-gray-200 rounded max-h-64 overflow-y-auto mb-4">
              {results.map((product) => {
                const selected = selectedIds.has(String(product._id));
                const disabled = selected || product.inOtherGroup;
                return (
                  <button
                    key={product._id}
                    type="button"
                    disabled={disabled}
                    onClick={() => addProduct(product)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 flex items-center justify-between ${disabled ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50"
                      }`}
                  >
                    <span>
                      {product.name}
                      <span className="text-gray-500 ml-2">{product.item_code}</span>
                    </span>
                    {selected ? (
                      <span>Selected</span>
                    ) : product.inOtherGroup ? (
                      <span>In another group</span>
                    ) : (
                      <span className="text-blue-700">Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">Search and select at least two existing products.</p>
          ) : (
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-gray-500">
                  {selectedProducts.length} products in columns (order = add order)
                </p>
                {selectedProducts.length > 4 && (
                  <p className="text-xs text-blue-700 font-medium">Scroll right to see all products</p>
                )}
              </div>
              <div
                className="w-full min-w-0 overflow-x-auto overflow-y-hidden border border-gray-200 rounded bg-white"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div
                  className="grid w-max min-w-full"
                  style={{
                    gridTemplateColumns: `12rem repeat(${selectedProducts.length}, 13rem)`,
                  }}
                >
                  {/* Header row */}
                  <div className="sticky left-0 z-20 px-3 py-3 font-medium text-gray-700 border-b border-r border-gray-200 bg-gray-50 flex items-center min-h-[76px]">
                    Variant
                  </div>
                  {selectedProducts.map((product, index) => (
                    <div
                      key={`head-${product._id}`}
                      className="px-3 py-2 border-b border-r border-gray-200 bg-gray-50 min-h-[76px]"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-gray-400 font-semibold mt-0.5">{index + 1}</span>
                        <img
                          src={productThumb(product)}
                          alt=""
                          className="w-9 h-9 flex-shrink-0 object-contain bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-800 leading-snug text-xs break-words">
                            {product.name}
                          </div>
                          <div className="text-[11px] text-gray-500 break-all">{product.item_code}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(product._id)}
                          className="flex-shrink-0 text-red-500"
                          title="Remove from group"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Attribute rows — left editor + product radios share the same row height */}
                  {attributes.map((attr, attrIndex) => {
                    const radioOptions = (attr.options || []).map((o) => String(o).trim()).filter(Boolean);
                    return (
                      <div key={`row-${attrIndex}`} className="contents">
                        <div className="sticky left-0 z-20 px-3 py-2 border-b border-r border-gray-200 bg-gray-50 min-w-[12rem] h-full">
                          <input
                            value={attr.name}
                            onChange={(e) => renameAttribute(attrIndex, e.target.value)}
                            className="w-full border rounded px-2 py-1 mb-2 text-sm"
                            placeholder="RAM / Storage / Size"
                          />
                          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <input
                              type="checkbox"
                              checked={attr.type === "color"}
                              onChange={(e) => setAttributeType(attrIndex, e.target.checked ? "color" : "text")}
                            />
                            Color attribute
                          </label>
                          <p className="text-[10px] text-gray-500 mb-1">Options (shown as radio on each product)</p>
                          {(attr.options || []).map((option, optionIndex) => (
                            <div key={`opt-${attrIndex}-${optionIndex}`} className="flex items-center gap-1 mb-1">
                              <input
                                value={option}
                                onChange={(e) => setOption(attrIndex, optionIndex, e.target.value)}
                                placeholder="e.g. 8GB RAM"
                                className="w-full border rounded px-1.5 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(attrIndex, optionIndex)}
                                className="text-red-500 text-xs"
                                title="Remove option"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(attrIndex)}
                            className="text-[11px] text-blue-700 mb-2"
                          >
                            + Add option
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttribute(attrIndex)}
                            className="block text-xs text-red-600"
                          >
                            Remove attribute
                          </button>
                        </div>

                        {selectedProducts.map((product) => {
                          const current = product.values?.[attr.name] || "";
                          return (
                            <div
                              key={`cell-${attrIndex}-${product._id}`}
                              className="px-3 py-2 border-b border-r border-gray-200 bg-white h-full"
                            >
                              {attr.type === "color" ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={getValueMeta(attr, current).colorHex || "#000000"}
                                    onChange={(e) => {
                                      if (current) {
                                        updateValueMeta(attrIndex, current, { colorHex: e.target.value });
                                      }
                                    }}
                                    className="h-8 w-8 flex-shrink-0 border rounded"
                                  />
                                  <input
                                    value={current}
                                    onChange={(e) => setProductValue(product._id, attr.name, e.target.value)}
                                    placeholder="Color name"
                                    className="w-full min-w-0 border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                              ) : radioOptions.length > 0 ? (
                                <div className="space-y-1.5">
                                  {radioOptions.map((option) => (
                                    <label key={option} className="flex items-center gap-1.5 text-xs text-gray-700">
                                      <input
                                        type="radio"
                                        name={`attr-${attrIndex}-${product._id}`}
                                        checked={current === option}
                                        onChange={() => setProductValue(product._id, attr.name, option)}
                                      />
                                      <span>{option}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <input
                                  value={current}
                                  onChange={(e) => setProductValue(product._id, attr.name, e.target.value)}
                                  placeholder="Value"
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addAttribute}
              className="inline-flex items-center gap-2 text-sm text-red-500"
            >
              <FaPlus /> Add Variant
            </button>
            <button
              type="button"
              onClick={fillColorsFromProductNames}
              className="inline-flex items-center gap-2 text-sm bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-500"
            >
              Color
            </button>
            <span className="text-xs text-gray-500">
              Color fills from the last part of the product name, e.g. Glacier Blue)
            </span>
          </div>
        </div>
      </div>

      {attributes.map((attr, attrIndex) => {
        const values = uniqueValues(selectedProducts, attr.name);
        if (!values.length) return null;
        return (
          <div key={`meta-${attrIndex}`} className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Optional images for {attr.name || "attribute"}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {values.map((value) => {
                const meta = getValueMeta(attr, value);
                const uploadKey = `${attrIndex}:${value}`;
                return (
                  <div key={value} className="border rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      {attr.type === "color" && (
                        <span
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: meta.colorHex || "#ccc" }}
                        />
                      )}
                      <strong>{value}</strong>
                    </div>
                    {meta.image && (
                      <img
                        src={meta.image.startsWith("/") || meta.image.startsWith("http") ? meta.image : `/uploads/products/${meta.image}`}
                        alt={value}
                        className="w-16 h-16 object-contain mb-2"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingKey === uploadKey}
                      onChange={(e) => uploadValueImage(attrIndex, value, e.target.files?.[0])}
                    />
                    {uploadingKey === uploadKey && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-red-500 text-white px-5 py-2 rounded text-sm hover:bg-red-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Variant Group"}
        </button>
      </div>
    </div>
  );
}
