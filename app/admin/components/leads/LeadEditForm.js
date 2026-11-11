"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const FORM_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "mobile", label: "Phone", required: true },
  { key: "city", label: "City" },
  { key: "store", label: "Store", type: "store-select" },
  { key: "message", label: "Message" },
  { key: "referrel_url", label: "Referrel URL" },
  { key: "lead_title", label: "Lead Title" },
  { key: "lead_source", label: "Lead Source" },
  { key: "product_looking_for", label: "Product Looking For" },
  { key: "product_category", label: "Product Category" },
  { key: "product_url", label: "Product Url" },
  { key: "preferred_time", label: "Preferred Time" },
  { key: "lead_type", label: "Lead Type" },
  { key: "invoice_id", label: "Invoice Id" },
  { key: "adtarbo_crm_id", label: "Adtarbo Crm Id" },
  { key: "lead_status", label: "Lead Status" },
  { key: "manager_comments", label: "Manager Comments" },
  { key: "date_fr_cmnts", label: "Date for Comments" },
];

const emptyForm = FORM_FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, { store_id: "" });

function storeLabel(row) {
  return (
    row?.title ||
    row?.name ||
    row?.store_name ||
    row?.organisation_name ||
    row?.slug ||
    ""
  );
}

function storeNumericId(row) {
  if (row?.exist_id != null && /^\d+$/.test(String(row.exist_id))) {
    return String(row.exist_id);
  }
  if (row?.store_id != null && /^\d+$/.test(String(row.store_id))) {
    return String(row.store_id);
  }
  return "";
}

export default function LeadEditForm({ leadId }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      /(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie)
    ) {
      router.replace("/admin/unilet-dashboard");
      return;
    }
    if (!leadId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [leadRes, storesRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`, { cache: "no-store" }),
          fetch("/api/store_listings/get?scope=admin", { cache: "no-store" }),
        ]);

        const leadData = await leadRes.json();
        if (!leadRes.ok || !leadData.success) {
          setAlertMessage(leadData.message || "Failed to load lead");
          setAlertType("error");
          return;
        }

        let storeRows = [];
        try {
          const storesJson = await storesRes.json();
          storeRows = Array.isArray(storesJson) ? storesJson : [];
        } catch {
          storeRows = [];
        }
        storeRows = storeRows
          .map((row) => ({
            ...row,
            _label: storeLabel(row),
            _storeId: storeNumericId(row),
          }))
          .filter((row) => row._label)
          .sort((a, b) => a._label.localeCompare(b._label));
        setStores(storeRows);

        const lead = leadData.data || {};
        const next = { ...emptyForm };
        for (const f of FORM_FIELDS) {
          next[f.key] = lead[f.key] != null ? String(lead[f.key]) : "";
        }
        next.store_id =
          lead.store_id != null && lead.store_id !== ""
            ? String(lead.store_id)
            : "";
        setForm(next);
      } catch (err) {
        console.error(err);
        setAlertMessage("Error loading lead");
        setAlertType("error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [leadId, router]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onStoreChange = (e) => {
    const title = e.target.value;
    const matched = stores.find((s) => s._label === title);
    setForm((prev) => ({
      ...prev,
      store: title,
      store_id: matched?._storeId || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!String(form.name || "").trim()) {
      setAlertMessage("Name is required");
      setAlertType("error");
      return;
    }
    if (!String(form.email || "").trim()) {
      setAlertMessage("Email is required");
      setAlertType("error");
      return;
    }
    if (!String(form.mobile || "").trim()) {
      setAlertMessage("Phone is required");
      setAlertType("error");
      return;
    }

    setSaving(true);
    setAlertMessage("");
    try {
      const res = await fetch("/api/leads/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: leadId,
          ...form,
          store_id: form.store_id === "" ? null : form.store_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertMessage("Lead updated successfully");
        setAlertType("success");
        setTimeout(() => router.push("/admin/leads"), 800);
      } else {
        setAlertMessage(data.message || "Failed to update lead");
        setAlertType("error");
      }
    } catch (err) {
      console.error(err);
      setAlertMessage("Error updating lead");
      setAlertType("error");
    } finally {
      setSaving(false);
    }
  };

  const storeOptions = (() => {
    const titles = new Set(stores.map((s) => s._label));
    const current = String(form.store || "").trim();
    if (current && !titles.has(current)) {
      return [{ _label: current, _storeId: form.store_id || "" }, ...stores];
    }
    return stores;
  })();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-6 px-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Edit Lead</h2>
        <button
          type="button"
          onClick={() => router.push("/admin/leads")}
          className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
        >
          <Icon icon="mdi:arrow-left" className="w-4 h-4" />
          Back to Leads
        </button>
      </div>

      {alertMessage && (
        <div
          className={`mb-4 p-3 rounded-md text-white text-sm ${
            alertType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {alertMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 sm:p-6 space-y-4"
      >
        {FORM_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`lead-${field.key}`}
              className="block text-sm font-semibold text-gray-800 mb-1.5"
            >
              {field.label}
              {field.required ? <span className="text-red-500">*</span> : null}
            </label>

            {field.type === "store-select" ? (
              <select
                id={`lead-${field.key}`}
                name={field.key}
                value={form.store || ""}
                onChange={onStoreChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              >
                <option value="">— Select Store —</option>
                {storeOptions.map((s) => (
                  <option key={`${s._id || s._label}-${s._storeId}`} value={s._label}>
                    {s._label}
                    {s.branch_code ? ` (${s.branch_code})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`lead-${field.key}`}
                type="text"
                name={field.key}
                value={form[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                required={!!field.required}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            )}
          </div>
        ))}

        <div className="pt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Update"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => router.push("/admin/leads")}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-5 py-2 rounded-md text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
