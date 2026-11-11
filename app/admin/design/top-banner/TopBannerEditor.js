"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import AdminLoader from "@/app/admin/components/AdminLoader";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const STATE_LABELS = {
  all: "All Regions",
  karnataka: "Karnataka",
  tamilnadu: "Tamil Nadu",
  andhra: "Andhra Pradesh",
  kerala: "Kerala",
  telangana: "Telangana",
};

const STATE_OPTIONS = [
  { value: "all", label: "All Regions (Default)" },
  { value: "karnataka", label: "Karnataka (Unilet)" },
  { value: "tamilnadu", label: "Tamil Nadu" },
  { value: "andhra", label: "Andhra Pradesh" },
  { value: "kerala", label: "Kerala" },
  { value: "telangana", label: "Telangana" },
];

const DEALS_STATES = ["kerala", "karnataka", "andhra", "telangana", "tamilnadu"];

function stateFromDealsEmail(email) {
  const local = String(email || "").split("@")[0].trim().toLowerCase();
  if (!local.endsWith("deals")) return "";
  const prefix = local.slice(0, -"deals".length);
  return DEALS_STATES.includes(prefix) ? prefix : "";
}

const emptyDraft = () => ({
  _id: "",
  desktopImage: "",
  mobileImage: "",
  desktopFile: null,
  mobileFile: null,
  desktopPreview: "",
  mobilePreview: "",
  url: "",
  state: "all",
  isActive: true,
  startDate: "",
  endDate: "",
});

function formatDateTimeForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTableDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortBanners(rows) {
  return [...(rows || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function toDraft(banner) {
  return {
    _id: banner?._id ? String(banner._id) : "",
    desktopImage: banner?.desktopImage || "",
    mobileImage: banner?.mobileImage || "",
    desktopFile: null,
    mobileFile: null,
    desktopPreview: banner?.desktopImage || "",
    mobilePreview: banner?.mobileImage || "",
    url: banner?.url || "",
    state: banner?.state || "all",
    isActive: banner?.isActive !== false,
    startDate: banner?.startDate ? formatDateTimeForInput(banner.startDate) : "",
    endDate: banner?.endDate ? formatDateTimeForInput(banner.endDate) : "",
  };
}

function getBannerTimerStatus(startDate, endDate) {
  if (!startDate && !endDate) {
    return { label: "Always Active", color: "bg-gray-100 text-gray-700 border-gray-200" };
  }
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && now < start) {
    return { label: "Upcoming", color: "bg-amber-50 text-amber-800 border-amber-300" };
  }
  if (end && now > end) {
    return { label: "Expired", color: "bg-red-50 text-red-700 border-red-300" };
  }
  return { label: "Live", color: "bg-emerald-50 text-emerald-800 border-emerald-300" };
}

export default function TopBannerEditor({ pageId }) {
  const [banners, setBanners] = useState([]);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState(null);
  const [stateFilter, setStateFilter] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [isDealsRole, setIsDealsRole] = useState(false);
  const [dealsState, setDealsState] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/home-topbanner?pageId=${pageId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load banners");
      setStatus(data.data?.status || "active");
      setBanners(sortBanners(data.data?.banners));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (pageId) load();
  }, [pageId, load]);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    if (!token) {
      setAccessReady(true);
      return undefined;
    }

    fetch("/api/auth/check", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const deals = String(data?.roleSlug || "").toLowerCase() === "deals-role";
        setIsDealsRole(deals);
        setDealsState(deals ? stateFromDealsEmail(data?.email) : "");
      })
      .catch(() => {
        if (!cancelled) {
          setIsDealsRole(false);
          setDealsState("");
        }
      })
      .finally(() => {
        if (!cancelled) setAccessReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (nextBanners) => {
    const fd = new FormData();
    fd.append("pageId", pageId);
    fd.append("pageType", "home");
    fd.append("status", status || "active");
    fd.append(
      "bannersMeta",
      JSON.stringify(
        nextBanners.map((b, i) => ({
          _id: b._id || "",
          desktopImage: b.desktopImage || "",
          mobileImage: b.mobileImage || "",
          url: b.url || "",
          state: b.state || "all",
          isActive: b.isActive !== false,
          startDate: b.startDate || null,
          endDate: b.endDate || null,
          order: i,
        }))
      )
    );
    nextBanners.forEach((b, i) => {
      if (b.desktopFile) fd.append(`desktopImage_${i}`, b.desktopFile);
      if (b.mobileFile) fd.append(`mobileImage_${i}`, b.mobileFile);
    });

    const res = await fetch("/api/home-topbanner", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Save failed");
    setStatus(data.data?.status || "active");
    setBanners(sortBanners(data.data?.banners));
  };

  const savePopup = async (event) => {
    event.preventDefault();
    if (!popup) return;
    const draft = { ...popup.draft };
    if (isDealsRole) {
      if (!dealsState) {
        setPopup((prev) => ({
          ...prev,
          error: "Your account email does not include a state.",
        }));
        return;
      }
      draft.state = dealsState;
    }
    if (!draft.desktopFile && !draft.desktopImage) {
      setPopup((prev) => ({ ...prev, error: "Desktop image is required." }));
      return;
    }

    setSaving(true);
    try {
      const next = banners.map(toDraft);
      if (popup.index === null) next.push(draft);
      else next[popup.index] = draft;
      await persist(next);
      setPopup(null);
    } catch (e) {
      setPopup((prev) => ({ ...prev, error: e.message }));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (index) => {
    setSaving(true);
    setError("");
    try {
      const next = banners.map(toDraft);
      next[index] = { ...next[index], isActive: next[index].isActive === false };
      await persist(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (index) => {
    const row = banners[index];
    const label = STATE_LABELS[row?.state] || row?.state || "this banner";
    if (!window.confirm(`Delete the ${label} banner? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      const next = banners.map(toDraft).filter((_, i) => i !== index);
      await persist(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch) => {
    setPopup((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch }, error: "" } : prev));
  };

  if (loading || !accessReady) return <AdminLoader />;

  const draft = popup?.draft;
  const stateOptions = isDealsRole
    ? STATE_OPTIONS.filter((option) => option.value === dealsState)
    : STATE_OPTIONS;
  const visibleRows = banners
    .map((banner, index) => ({ banner, index }))
    .filter(({ banner }) => {
      if (isDealsRole) return Boolean(dealsState) && (banner.state || "") === dealsState;
      return !stateFilter || (banner.state || "all") === stateFilter;
    });

  return (
    <div className="w-full py-4">
      <div className="mb-4">
        <Link
          href="/admin/design/top-banner"
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          ← Top Banner
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold">Top Banner</h2>
            <p className="text-sm text-gray-500 mt-1">
              Existing banner records for this page.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPopup({
                index: null,
                draft: { ...emptyDraft(), state: isDealsRole ? dealsState || "" : "all" },
                error: "",
              })
            }
            disabled={isDealsRole && !dealsState}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D] disabled:opacity-50"
          >
            <Icon icon="mdi:plus" /> Add New
          </button>
        </div>

        {!isDealsRole && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-medium text-gray-700" htmlFor="top-banner-state-filter">
              Filter by state
            </label>
            <select
              id="top-banner-state-filter"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-64"
            >
              <option value="">All States</option>
              <option value="all">All Regions</option>
              <option value="karnataka">Karnataka</option>
              <option value="tamilnadu">Tamil Nadu</option>
              <option value="andhra">Andhra Pradesh</option>
              <option value="kerala">Kerala</option>
              <option value="telangana">Telangana</option>
            </select>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] table-fixed text-sm">
            <colgroup>
              <col className="w-16" />
              <col className="w-[280px]" />
              <col className="w-36" />
              <col className="w-44" />
              <col className="w-44" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-3 py-2 font-semibold">SNO</th>
                <th className="px-3 py-2 font-semibold">Desktop Image</th>
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 font-semibold">Start date</th>
                <th className="px-3 py-2 font-semibold">End date</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    {isDealsRole && !dealsState
                      ? "Your account email does not include a state."
                      : banners.length === 0
                        ? "No banners yet. Click Add New to create one."
                        : "No banners for this state."}
                  </td>
                </tr>
              ) : (
                visibleRows.map(({ banner, index }, rowIndex) => (
                  <tr key={banner._id || index} className="border-b last:border-0">
                    <td className="px-3 py-3 text-gray-700">{rowIndex + 1}</td>
                    <td className="px-3 py-3">
                      {banner.desktopImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={banner.desktopImage}
                          alt=""
                          className="block h-auto w-full max-w-[71%] rounded border bg-gray-100 object-contain"
                        />
                      ) : (
                        <span className="inline-flex h-16 w-full items-center justify-center rounded border bg-gray-50 text-[11px] text-gray-400">
                          No image
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      {STATE_LABELS[banner.state] || banner.state || "All Regions"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                      {formatTableDate(banner.startDate)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                      {formatTableDate(banner.endDate)}
                    </td>
                    <td className="px-3 py-3">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={banner.isActive !== false}
                          onChange={() => toggleActive(index)}
                          disabled={saving}
                          className="peer sr-only"
                          aria-label={banner.isActive !== false ? "Active" : "Inactive"}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#ED1C24] peer-checked:after:translate-x-full peer-disabled:opacity-50" />
                      </label>
                      <span className="mt-1 block text-[11px] text-gray-500">
                        {banner.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPopup({ index, draft: toDraft(banner), error: "" })}
                        className="text-sm font-semibold text-[#ED1C24] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        disabled={saving}
                        className="ml-3 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <form
            onSubmit={savePopup}
            className="my-auto w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {popup.index === null ? "New Banner" : `Banner #${popup.index + 1}`}
              </h3>
            </div>

            {popup.error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {popup.error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Banner Image (Desktop) *
                </label>
                <input
                  type="file"
                  accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                  onChange={(e) => {
                    const { file, error: fileError } = consumeAllowedCategoryPageImage(
                      e.target.files?.[0],
                      e.target
                    );
                    if (fileError) {
                      setPopup((prev) => ({ ...prev, error: fileError }));
                      return;
                    }
                    if (!file) return;
                    updateDraft({
                      desktopFile: file,
                      desktopPreview: URL.createObjectURL(file),
                    });
                  }}
                  className="w-full text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-400">{CATEGORY_PAGE_IMAGE_ACCEPT_HINT}</p>
                {draft.desktopPreview && (
                  <div className="relative mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.desktopPreview}
                      alt=""
                      className="h-24 w-full rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({ desktopFile: null, desktopImage: "", desktopPreview: "" })
                      }
                      className="absolute right-1 top-1 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600"
                    >
                      Clear Image
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Mobile Banner Image
                </label>
                <input
                  type="file"
                  accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                  onChange={(e) => {
                    const { file, error: fileError } = consumeAllowedCategoryPageImage(
                      e.target.files?.[0],
                      e.target
                    );
                    if (fileError) {
                      setPopup((prev) => ({ ...prev, error: fileError }));
                      return;
                    }
                    if (!file) return;
                    updateDraft({
                      mobileFile: file,
                      mobilePreview: URL.createObjectURL(file),
                    });
                  }}
                  className="w-full text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-400">{CATEGORY_PAGE_IMAGE_ACCEPT_HINT}</p>
                {draft.mobilePreview && (
                  <div className="relative mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.mobilePreview}
                      alt=""
                      className="h-24 w-full rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({ mobileFile: null, mobileImage: "", mobilePreview: "" })
                      }
                      className="absolute right-1 top-1 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600"
                    >
                      Clear Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Target Region / State
                </label>
                <select
                  value={isDealsRole ? dealsState : draft.state || "all"}
                  onChange={(e) => {
                    if (isDealsRole) return;
                    updateDraft({ state: e.target.value });
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {stateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Banner URL</label>
                <input
                  type="text"
                  value={draft.url}
                  onChange={(e) => updateDraft({ url: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="/category/... or https://..."
                />
              </div>
            </div>

            <div className="mt-3 border-t border-gray-200 pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                  <span>⏰</span> Schedule / Timer (Optional)
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${getBannerTimerStatus(draft.startDate, draft.endDate).color}`}
                >
                  {getBannerTimerStatus(draft.startDate, draft.endDate).label}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Show From (Start Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={draft.startDate || ""}
                    onChange={(e) => updateDraft({ startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Hide After (End Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={draft.endDate || ""}
                    onChange={(e) => updateDraft({ endDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
              </div>
              {(draft.startDate || draft.endDate) && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateDraft({ startDate: "", endDate: "" })}
                    className="text-[11px] text-gray-500 underline hover:text-red-600"
                  >
                    Clear Schedule (Show Always)
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => updateDraft({ isActive: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#ED1C24] peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm">{draft.isActive ? "Active" : "Inactive"}</span>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#ED1C24] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Top Banner"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
