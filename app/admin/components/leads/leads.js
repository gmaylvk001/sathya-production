"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

function formatLeadDate(value) {
  if (!value) return { date: "-", time: "" };
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: "-", time: "" };
    const date = formatInputDate(d);
    const time = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { date, time };
  } catch {
    return { date: "-", time: "" };
  }
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { startDate: formatInputDate(start), endDate: formatInputDate(end) };
}

function norm(value) {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueSorted(values) {
  const seen = new Set();
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) seen.add(text);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function leadDay(lead) {
  const raw = lead?.created_at || lead?.createdAt || lead?.enquiry_date;
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return formatInputDate(date);
  const text = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function inDateRange(day, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!day) return false;
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

function storeKeys(store) {
  return [store?._id, store?.exist_id, store?.title, store?.branch_code, store?.slug]
    .map(norm)
    .filter(Boolean);
}

function leadStoreKeys(lead) {
  return [lead?.store, lead?.store_id].map(norm).filter(Boolean);
}

function leadMatchesStoreOption(lead, option) {
  if (!option) return true;
  const keys = leadStoreKeys(lead);
  if (option.kind === "name") return keys.includes(norm(option.name));
  const allowed = new Set(option.keys);
  return keys.some((key) => allowed.has(key));
}

const emptyFilters = {
  leadTitle: "",
  leadSource: "",
  leadStatus: "",
  store: "",
  zone: "",
  eventCategory: "",
  campaigns: [],
  startDate: "",
  endDate: "",
};

const selectClass =
  "h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm text-gray-700";

export default function LeadsComponent() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [stores, setStores] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const leadsPerPage = 20;

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      /(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie)
    ) {
      router.replace("/admin/unilet-dashboard");
      return;
    }
    const range = defaultDateRange();
    setDraft((current) => ({ ...current, ...range }));
    setApplied((current) => ({ ...current, ...range }));
    fetchLeads();
    fetchFilterLists();
  }, [router]);

  const showAlert = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMessage("");
      setAlertType("");
    }, 3000);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leads/get", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) {
        showAlert(data.message || "Sathya view only", "error");
        router.replace("/admin/dashboard");
        return;
      }
      if (data.success) {
        setLeads(Array.isArray(data.data) ? data.data : []);
      } else {
        showAlert(data.message || "Failed to load leads", "error");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      showAlert("Error fetching leads", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterLists = async () => {
    try {
      const [storeRes, zoneRes] = await Promise.all([
        fetch("/api/store_listings/get?scope=admin", { cache: "no-store" }),
        fetch("/api/store_zones/get", { cache: "no-store" }),
      ]);
      const storeRows = await storeRes.json().catch(() => []);
      const zoneRows = await zoneRes.json().catch(() => []);
      setStores(Array.isArray(storeRows) ? storeRows : []);
      setZones(Array.isArray(zoneRows) ? zoneRows : []);
    } catch (error) {
      console.error("Error fetching lead filters:", error);
    }
  };

  const titleOptions = useMemo(
    () => uniqueSorted(leads.map((lead) => lead.lead_title)),
    [leads]
  );
  const sourceOptions = useMemo(
    () => uniqueSorted(leads.map((lead) => lead.lead_source)),
    [leads]
  );
  const statusOptions = useMemo(
    () => uniqueSorted(leads.map((lead) => lead.lead_status)),
    [leads]
  );
  const campaignOptions = useMemo(
    () => uniqueSorted(leads.map((lead) => lead.lead_campaign)),
    [leads]
  );
  const eventOptions = useMemo(
    () => uniqueSorted(leads.map((lead) => lead.event_category)),
    [leads]
  );

  const zoneOptions = useMemo(() => {
    return zones
      .map((zone) => {
        const code = Number(String(zone.exist_id ?? "").trim());
        return {
          value: Number.isFinite(code) ? String(code) : "",
          label: String(zone.zonename || zone.slug || "").trim(),
        };
      })
      .filter((zone) => zone.value && zone.label)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [zones]);

  const storeOptions = useMemo(() => {
    const fromListings = stores
      .map((store) => {
        const title = String(store.title || store.slug || "").trim();
        if (!title) return null;
        const branch = String(store.branch_code || "").trim();
        return {
          value: `id:${store._id}`,
          label: branch ? `${title} (${branch})` : title,
          kind: "listing",
          keys: storeKeys(store),
          zoneCode: store.zone_code == null || store.zone_code === "" ? "" : String(store.zone_code),
        };
      })
      .filter(Boolean);

    const known = new Set(fromListings.flatMap((store) => store.keys));
    const extras = uniqueSorted(leads.map((lead) => lead.store))
      .filter((name) => !known.has(norm(name)))
      .map((name) => ({
        value: `name:${norm(name)}`,
        label: name,
        kind: "name",
        name,
        keys: [norm(name)],
        zoneCode: "",
      }));

    return [...fromListings, ...extras].sort((a, b) => a.label.localeCompare(b.label));
  }, [stores, leads]);

  const draftStoreOptions = draft.zone
    ? storeOptions.filter((store) => store.zoneCode === draft.zone)
    : storeOptions;

  const matchesFilters = (lead, filters) => {
    if (filters.leadTitle && norm(lead.lead_title) !== norm(filters.leadTitle)) return false;
    if (filters.leadSource && norm(lead.lead_source) !== norm(filters.leadSource)) return false;
    if (filters.leadStatus && norm(lead.lead_status) !== norm(filters.leadStatus)) return false;
    if (filters.eventCategory && norm(lead.event_category) !== norm(filters.eventCategory)) {
      return false;
    }
    if (!inDateRange(leadDay(lead), filters.startDate, filters.endDate)) return false;

    const selectedCampaigns = (filters.campaigns || []).filter(Boolean);
    if (
      selectedCampaigns.length > 0 &&
      !selectedCampaigns.some((campaign) => norm(campaign) === norm(lead.lead_campaign))
    ) {
      return false;
    }

    if (filters.store) {
      const option = storeOptions.find((store) => store.value === filters.store);
      if (!option || !leadMatchesStoreOption(lead, option)) return false;
    }

    if (filters.zone) {
      const zoneStores = storeOptions.filter((store) => store.zoneCode === filters.zone);
      if (!zoneStores.some((store) => leadMatchesStoreOption(lead, store))) return false;
    }

    return true;
  };

  const matchesSearch = (lead) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.mobile?.includes(searchTerm) ||
      lead.store?.toLowerCase().includes(q) ||
      lead.product_looking_for?.toLowerCase().includes(q) ||
      lead.lead_title?.toLowerCase().includes(q) ||
      lead.lead_source?.toLowerCase().includes(q) ||
      lead.lead_campaign?.toLowerCase().includes(q) ||
      lead.lead_status?.toLowerCase().includes(q) ||
      lead.manager_comments?.toLowerCase().includes(q)
    );
  };

  const filteredLeads = leads.filter((lead) => {
    if (!matchesFilters(lead, applied)) return false;
    return matchesSearch(lead);
  });

  const indexOfLast = currentPage * leadsPerPage;
  const indexOfFirst = indexOfLast - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / leadsPerPage));
  const startEntry = filteredLeads.length === 0 ? 0 : indexOfFirst + 1;
  const endEntry = Math.min(indexOfLast, filteredLeads.length);

  const setDraftField = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "zone" && next.store) {
        const store = storeOptions.find((item) => item.value === next.store);
        if (!value) return next;
        if (!store || store.zoneCode !== value) next.store = "";
      }
      return next;
    });
  };

  const onCampaignChange = (event) => {
    const next = Array.from(event.target.selectedOptions).map((option) => option.value);
    setDraft((current) => {
      const previousAll = current.campaigns.length === 0;
      if (next.includes("")) {
        return { ...current, campaigns: previousAll ? next.filter(Boolean) : [] };
      }
      return { ...current, campaigns: next };
    });
  };

  const applyFilters = () => {
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      showAlert("Start date must be on or before the end date", "error");
      return;
    }
    setApplied({ ...draft, campaigns: [...draft.campaigns] });
    setCurrentPage(1);
  };

  const exportLeads = async () => {
    if (exporting) return;
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      showAlert("Start date must be on or before the end date", "error");
      return;
    }
    const nextFilters = { ...draft, campaigns: [...draft.campaigns] };
    const rowsToExport = leads.filter(
      (lead) => matchesFilters(lead, nextFilters) && matchesSearch(lead)
    );
    setApplied(nextFilters);
    setCurrentPage(1);
    if (rowsToExport.length === 0) {
      showAlert("No leads to export", "error");
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = rowsToExport.map((lead) => {
        const { date, time } = formatLeadDate(lead.created_at || lead.createdAt);
        return {
          Name: lead.name || "",
          Email: lead.email || "",
          Mobile: lead.mobile || "",
          Store: lead.store || "",
          Product: lead.product_looking_for || "",
          Category: lead.product_category || "",
          "Lead Title": lead.lead_title || "",
          Source: lead.lead_source || "",
          Campaign: lead.lead_campaign || "",
          Status: lead.lead_status || "",
          "Event Category": lead.event_category || "",
          "Manager Comment": lead.manager_comments || "",
          Date: date === "-" ? "" : date,
          Time: time || "",
          "Product URL": lead.product_url || "",
          "CRM Id": lead.adtarbo_crm_id || "",
        };
      });
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Leads");
      const stamp = nextFilters.startDate && nextFilters.endDate
        ? `${nextFilters.startDate}-to-${nextFilters.endDate}`
        : "all";
      XLSX.writeFile(book, `crm-leads-${stamp}.xlsx`);
    } catch (error) {
      console.error("Lead export error:", error);
      showAlert("Failed to export leads", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!leadToDelete?._id || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/leads/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadToDelete._id }),
      });
      const result = await response.json();
      if (result.success) {
        setLeads((prev) => prev.filter((lead) => lead._id !== leadToDelete._id));
        showAlert("Lead deleted successfully", "success");
      } else {
        showAlert(result.message || "Failed to delete lead", "error");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      showAlert("Error deleting lead", "error");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setLeadToDelete(null);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 mt-5">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Icon icon="mdi:database" className="text-red-500 w-7 h-7" />
          CRM — Leads
        </h2>
        <div className="flex items-center bg-white border border-gray-200 rounded-md px-3 py-2 w-full max-w-sm">
          <Icon icon="ph:magnifying-glass" className="text-gray-400 w-5 h-5 mr-2" />
          <input
            type="text"
            placeholder="Search name, mobile, title, source..."
            className="bg-transparent border-none outline-none w-full text-sm text-gray-700"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            aria-label="Lead Title"
            value={draft.leadTitle}
            onChange={setDraftField("leadTitle")}
            className={selectClass}
          >
            <option value="">Lead Title</option>
            {titleOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <select
            aria-label="Lead source"
            value={draft.leadSource}
            onChange={setDraftField("leadSource")}
            className={selectClass}
          >
            <option value="">LeadSource</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select
            aria-label="Lead status"
            value={draft.leadStatus}
            onChange={setDraftField("leadStatus")}
            className={selectClass}
          >
            <option value="">LeadStatus</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            aria-label="Store"
            value={draft.store}
            onChange={setDraftField("store")}
            className={selectClass}
          >
            <option value="">All Stores</option>
            {draftStoreOptions.map((store) => (
              <option key={store.value} value={store.value}>
                {store.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex h-9 min-w-[240px] flex-1 items-center gap-1 rounded border border-gray-300 bg-white px-2">
            <input
              type="date"
              aria-label="Start date"
              value={draft.startDate}
              max={draft.endDate || undefined}
              onChange={setDraftField("startDate")}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-700 outline-none"
            />
            <span className="text-sm text-gray-500">-</span>
            <input
              type="date"
              aria-label="End date"
              value={draft.endDate}
              min={draft.startDate || undefined}
              onChange={setDraftField("endDate")}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <select
            aria-label="Campaigns"
            multiple
            value={draft.campaigns}
            onChange={onCampaignChange}
            className="h-[4.5rem] min-w-[200px] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="">All Campaigns</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign} value={campaign}>
                {campaign}
              </option>
            ))}
          </select>

          <select
            aria-label="Zone"
            value={draft.zone}
            onChange={setDraftField("zone")}
            className={`${selectClass} min-w-[160px] flex-1`}
          >
            <option value="">All Zones</option>
            {zoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>

          <div className="flex min-w-[280px] flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Event category"
              value={draft.eventCategory}
              onChange={setDraftField("eventCategory")}
              className={selectClass}
            >
              <option value="">Choose Event Categories</option>
              {eventOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyFilters}
              className="h-9 shrink-0 rounded bg-[#3b7fc4] px-4 text-sm text-white hover:bg-[#326daa]"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={exportLeads}
              disabled={exporting}
              className="h-9 shrink-0 rounded bg-[#3b7fc4] px-4 text-sm text-white hover:bg-[#326daa] disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>
      </div>

      {alertMessage && (
        <div
          className={`mb-4 p-3 rounded-md text-white ${
            alertType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {alertMessage}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-800 font-semibold">
                <th className="px-3 py-3 whitespace-nowrap">Name</th>
                <th className="px-3 py-3 whitespace-nowrap">Mobile</th>
                <th className="px-3 py-3 whitespace-nowrap">Store</th>
                <th className="px-3 py-3 whitespace-nowrap">Product</th>
                <th className="px-3 py-3 whitespace-nowrap">Source</th>
                <th className="px-3 py-3 whitespace-nowrap">Campaign</th>
                <th className="px-3 py-3 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 whitespace-nowrap">Manager Comment</th>
                <th className="px-3 py-3 whitespace-nowrap">Date</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentLeads.length > 0 ? (
                currentLeads.map((lead) => {
                  const { date, time } = formatLeadDate(lead.created_at || lead.createdAt);
                  return (
                    <tr
                      key={lead._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top"
                    >
                      <td className="px-3 py-3 text-gray-900 font-medium max-w-[160px]">
                        {lead.name || "-"}
                      </td>
                      <td className="px-3 py-3 text-gray-800 whitespace-nowrap">
                        {lead.mobile || "-"}
                      </td>
                      <td
                        className="px-3 py-3 text-gray-700 max-w-[140px] truncate"
                        title={lead.store || ""}
                      >
                        {lead.store || ""}
                      </td>
                      <td
                        className="px-3 py-3 text-gray-700 max-w-[180px] truncate"
                        title={lead.product_looking_for || ""}
                      >
                        {lead.product_looking_for || ""}
                      </td>
                      <td className="px-3 py-3 text-gray-700 max-w-[140px]">
                        <span className="whitespace-pre-line leading-snug">
                          {lead.lead_source || ""}
                        </span>
                      </td>
                      <td
                        className="px-3 py-3 text-gray-700 max-w-[120px] truncate"
                        title={lead.lead_campaign || ""}
                      >
                        {lead.lead_campaign || ""}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        {lead.lead_status || ""}
                      </td>
                      <td
                        className="px-3 py-3 text-gray-700 max-w-[180px] truncate"
                        title={lead.manager_comments || ""}
                      >
                        {lead.manager_comments || ""}
                      </td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                        <div className="leading-snug">
                          <div>{date}</div>
                          {time ? <div className="text-gray-500 text-xs">{time}</div> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/leads/edit/${lead._id}`)}
                            className="w-8 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLeadToDelete(lead);
                              setShowDeleteModal(true);
                            }}
                            className="w-8 h-8 bg-red-50 text-red-600 hover:bg-red-100 rounded-full inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-gray-500">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredLeads.length > 0 && (
            <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
              <div className="text-sm text-gray-600">
                Showing {startEntry} to {endEntry} of {filteredLeads.length} entries
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 border rounded-md ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed bg-gray-100"
                      : "text-black bg-white hover:bg-gray-100"
                  }`}
                >
                  «
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 border rounded-md ${
                      currentPage === i + 1
                        ? "bg-red-500 text-white"
                        : "text-black bg-white hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 border rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed bg-gray-100"
                      : "text-black bg-white hover:bg-gray-100"
                  }`}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Lead</h3>
            <p className="text-sm text-gray-600 mb-5">
              Delete lead{" "}
              <span className="font-semibold">
                {leadToDelete?.name || leadToDelete?.mobile}
              </span>
              ? This will soft-delete the record.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setLeadToDelete(null);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
