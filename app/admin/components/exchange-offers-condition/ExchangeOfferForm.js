"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";

const EMPTY_FORM = {
  categoryName: "ANY",
  brand: "ANY",
  type: "ANY",
  condition: "ANY",
  zone: "ANY",
  price: "",
  status: "Active",
};

function withCurrentValue(options, current) {
  const list = Array.isArray(options) ? options : [];
  const value = String(current || "").trim();
  if (value && !list.includes(value)) return [value, ...list];
  return list;
}

function SelectField({ label, name, value, options, onChange, required = false }) {
  return (
    <div className="flex items-center">
      <label className="w-1/4 text-sm font-semibold text-gray-700">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-3/4 border rounded p-2 bg-white focus:outline-none focus:border-blue-400"
      >
        {options.map((option) => (
          <option key={`${name}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ExchangeOfferForm({ isEdit = false, initialData = null }) {
  const router = useRouter();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [options, setOptions] = useState({
    categories: ["ANY"],
    brands: ["ANY"],
    types: ["ANY"],
    conditions: ["ANY"],
    zones: ["ANY"],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        categoryName: initialData.categoryName || "ANY",
        brand: initialData.brand || "ANY",
        type: initialData.type || "ANY",
        condition: initialData.condition || "ANY",
        zone: initialData.zone || "ANY",
        price: initialData.price || "",
        status: initialData.status || "Active",
      });
    }
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const params = formData.categoryName
          ? `?categoryName=${encodeURIComponent(formData.categoryName)}`
          : "";
        const res = await fetch(`/api/exchange-offers-condition/form-options${params}`);
        const data = await res.json();
        if (!cancelled && res.ok && data.success) {
          setOptions((prev) => ({ ...prev, ...data.data }));
        }
      } catch (err) {
        console.error("Failed to load exchange offer dropdowns:", err);
      }
    };
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "categoryName" ? { brand: "ANY", type: "ANY" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    const url = isEdit ? "/api/exchange-offers-condition/update" : "/api/exchange-offers-condition/add";
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { ...formData, _id: initialData._id } : formData;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push("/admin/exchange-offers-condition");
        }, 1500);
      } else {
        setError(result.error || "Failed to save offer.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 shadow-sm border rounded-lg max-w-3xl">
      <h2 className="text-2xl font-light text-gray-700 mb-6">
        {isEdit ? "Edit Exchange Offer" : "Create Exchange Offer"}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose from the lists below. <span className="font-semibold">ANY</span> applies this offer to all values in that field.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit && initialData && (
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">ID</label>
            <input
              type="text"
              value={initialData.id || ""}
              readOnly
              className="w-3/4 border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
        )}
        <SelectField
          label="Category Name"
          name="categoryName"
          value={formData.categoryName}
          options={withCurrentValue(options.categories, formData.categoryName)}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Brand"
          name="brand"
          value={formData.brand}
          options={withCurrentValue(options.brands, formData.brand)}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Type"
          name="type"
          value={formData.type}
          options={withCurrentValue(options.types, formData.type)}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Condition"
          name="condition"
          value={formData.condition}
          options={withCurrentValue(options.conditions, formData.condition)}
          onChange={handleChange}
          required
        />
        <SelectField
          label="Zone"
          name="zone"
          value={formData.zone}
          options={withCurrentValue(options.zones, formData.zone)}
          onChange={handleChange}
          required
        />
        <div className="flex items-center">
          <label className="w-1/4 text-sm font-semibold text-gray-700">Price</label>
          <input
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
            className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center">
          <label className="w-1/4 text-sm font-semibold text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Link
            href="/admin/exchange-offers-condition"
            className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className={`px-4 py-2 text-white rounded flex items-center gap-2 ${
              isSaving ? "bg-green-400" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isSaving ? (
              <Icon icon="eos-icons:loading" className="animate-spin" />
            ) : (
              <Icon icon="mingcute:check-line" />
            )}
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
