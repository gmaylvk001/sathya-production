"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OFFER_TIMER_STATES, toDateTimeLocal } from "@/lib/offerTimer";
import { loadDealsRoleAccess, offerTimerContainsState } from "@/lib/dealsRoleState";

const ALL_STATE_VALUES = OFFER_TIMER_STATES.map((s) => s.value);

const emptyForm = {
  offerTitle: "",
  startDate: "",
  endDate: "",
  offerViewStates: ["all"],
  timerDisplayStatus: "Yes",
  offerHeading: "",
  offerDescription: "",
};

export default function OfferTimerForm({ timerId = null }) {
  const router = useRouter();
  const isEditMode = Boolean(timerId);
  const [formData, setFormData] = useState(emptyForm);
  const [displayId, setDisplayId] = useState(isEditMode ? "" : "(Auto-generated)");
  const [topBannerFile, setTopBannerFile] = useState(null);
  const [popupFile, setPopupFile] = useState(null);
  const [topBannerPreview, setTopBannerPreview] = useState(null);
  const [popupPreview, setPopupPreview] = useState(null);
  const [removeTopBanner, setRemoveTopBanner] = useState(false);
  const [removeDealsPopup, setRemoveDealsPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [isDealsRole, setIsDealsRole] = useState(false);
  const [dealsState, setDealsState] = useState("");
  const [preservedStates, setPreservedStates] = useState([]);
  const [stateBlocked, setStateBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDealsRoleAccess().then((access) => {
      if (cancelled) return;
      setIsDealsRole(access.isDealsRole);
      setDealsState(access.dealsState);
      if (access.isDealsRole && access.dealsState && !timerId) {
        setFormData((prev) => ({ ...prev, offerViewStates: [access.dealsState] }));
      }
      setAccessReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [timerId]);

  useEffect(() => {
    if (!timerId) return;

    const fetchTimer = async () => {
      try {
        const response = await fetch(`/api/offer-timer/${timerId}`);
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Offer timer not found");
          return;
        }
        const timer = result.data;
        const states = timer.offerViewStates || [];
        const isAll = states.includes("all") || timer.state === "all" || states.length === 0;
        const access = await loadDealsRoleAccess();
        if (access.isDealsRole) {
          if (!access.dealsState || !offerTimerContainsState(timer, access.dealsState)) {
            setStateBlocked(true);
            setError("This offer timer is not available for your state.");
            return;
          }
          setPreservedStates(isAll ? ["all"] : states.filter((item) => item !== "all" && item !== access.dealsState));
        }

        setDisplayId(String(timer.timerId ?? timerId));
        setFormData({
          offerTitle: timer.offerTitle || "",
          startDate: toDateTimeLocal(timer.startDate),
          endDate: toDateTimeLocal(timer.endDate),
          offerViewStates: access.isDealsRole
            ? [access.dealsState]
            : isAll
              ? ["all"]
              : states.filter((item) => item !== "all"),
          timerDisplayStatus: timer.timerDisplayStatus || "Yes",
          offerHeading: timer.offerHeading || "",
          offerDescription: timer.offerDescription || "",
        });

        if (timer.topBanner) {
          const bannerUrl = timer.topBanner.startsWith("/")
            ? timer.topBanner
            : `/uploads/topbanner/${timer.topBanner}`;
          setTopBannerPreview(bannerUrl);
        }
        if (timer.dealsPopupImage) {
          const popupUrl = timer.dealsPopupImage.startsWith("/")
            ? timer.dealsPopupImage
            : `/uploads/topbanner/${timer.dealsPopupImage}`;
          setPopupPreview(popupUrl);
        }
      } catch (err) {
        setError("Failed to load offer timer");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimer();
  }, [timerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isAllSelected = formData.offerViewStates.includes("all");

  const handleAllToggle = () => {
    setFormData((prev) => {
      if (prev.offerViewStates.includes("all")) {
        // Uncheck All -> restore enabled individual checkboxes (empty selection initially)
        return { ...prev, offerViewStates: [] };
      } else {
        // Check All directly -> clear/disable the 5 individual states
        return { ...prev, offerViewStates: ["all"] };
      }
    });
  };

  const handleIndividualStateToggle = (val) => {
    setFormData((prev) => {
      const currentList = prev.offerViewStates.filter((s) => s !== "all");
      let updated;
      if (currentList.includes(val)) {
        updated = currentList.filter((s) => s !== val);
      } else {
        updated = [...currentList, val];
      }

      // If all 5 individual states selected -> automatically convert to All
      if (updated.length === ALL_STATE_VALUES.length && ALL_STATE_VALUES.every((s) => updated.includes(s))) {
        return { ...prev, offerViewStates: ["all"] };
      }

      return { ...prev, offerViewStates: updated };
    });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size should not exceed 5MB.");
      return;
    }

    setError("");
    const preview = URL.createObjectURL(file);
    if (field === "topBanner") {
      setTopBannerFile(file);
      setTopBannerPreview(preview);
      setRemoveTopBanner(false);

      const image = new window.Image();
      image.onload = () => {
        if (image.width !== 1578 || image.height !== 117) {
          // Keep informational size note
        }
      };
      image.src = preview;
    } else {
      setPopupFile(file);
      setPopupPreview(preview);
      setRemoveDealsPopup(false);
    }
  };

  const handleRemoveImage = (field) => {
    if (field === "topBanner") {
      setTopBannerFile(null);
      setTopBannerPreview(null);
      setRemoveTopBanner(true);
    } else {
      setPopupFile(null);
      setPopupPreview(null);
      setRemoveDealsPopup(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    if (!formData.offerTitle.trim()) {
      setError("Offer title is required");
      setIsSaving(false);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Start date and end date are required");
      setIsSaving(false);
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Invalid start or end date");
      setIsSaving(false);
      return;
    }

    if (end <= start) {
      setError("End date must be after start date");
      setIsSaving(false);
      return;
    }

    try {
      const data = new FormData();
      if (isEditMode) data.append("id", timerId);
      data.append("offerTitle", formData.offerTitle.trim());
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("timerDisplayStatus", formData.timerDisplayStatus);
      data.append("offerHeading", formData.offerHeading.trim());
      data.append("offerDescription", formData.offerDescription.trim());

      let statesToSend = formData.offerViewStates.length ? formData.offerViewStates : ["all"];
      if (isDealsRole) {
        if (!dealsState) {
          setError("Your account email does not include a state.");
          setIsSaving(false);
          return;
        }
        statesToSend = preservedStates.includes("all")
          ? ["all"]
          : [...new Set([...preservedStates, dealsState])];
      }
      statesToSend.forEach((state) => data.append("offerViewStates", state));

      if (topBannerFile) {
        data.append("topBanner", topBannerFile);
      }
      if (removeTopBanner) {
        data.append("removeTopBanner", "true");
      }

      if (popupFile) {
        data.append("dealsPopupImage", popupFile);
      }
      if (removeDealsPopup) {
        data.append("removeDealsPopupImage", "true");
      }

      const response = await fetch(isEditMode ? "/api/offer-timer/update" : "/api/offer-timer/add", {
        method: isEditMode ? "PUT" : "POST",
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || result.message || "Failed to save offer timer");
        return;
      }

      try {
        localStorage.setItem("sathya_offer_timer_sync", Date.now().toString());
        window.dispatchEvent(new Event("offerTimerUpdated"));
      } catch (e) {}

      router.push("/admin/offer-timer");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save offer timer");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !accessReady) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-gray-600">Loading offer timer...</p>
      </div>
    );
  }

  if (stateBlocked) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/admin/offer-timer")}
          className="mt-3 text-sm font-medium text-[#ED1C24] hover:underline"
        >
          Back to Offer Timers
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-12">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">
          {isEditMode ? "Edit Offers Timer" : "Create Offers Timer"}
        </h2>
        <button
          type="button"
          onClick={() => router.push("/admin/offer-timer")}
          className="border px-4 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          Back to list
        </button>
      </div>

      <div className="bg-white shadow-sm border rounded-lg p-6 max-w-4xl">
        {error && <div className="mb-4 bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ID Field */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">ID</label>
            <input
              value={displayId}
              readOnly
              className="w-3/4 border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Offer Title */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">Offer Title</label>
            <input
              name="offerTitle"
              value={formData.offerTitle}
              onChange={handleChange}
              placeholder="e.g. Local Holiday"
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* Start Date */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">Start Date</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* End Date */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">End Date</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* States Checkboxes */}
          <div className="flex items-start">
            <label className="w-1/4 text-sm font-semibold text-gray-700 pt-1">States</label>
            <div className="w-3/4 flex flex-wrap items-center gap-6">
              {!isDealsRole && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleAllToggle}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  All
                </label>
              )}

              {(isDealsRole
                ? OFFER_TIMER_STATES.filter((state) => state.value === dealsState)
                : OFFER_TIMER_STATES
              ).map((state) => {
                const isChecked = isDealsRole
                  ? true
                  : !isAllSelected && formData.offerViewStates.includes(state.value);
                return (
                  <label
                    key={state.value}
                    className={`inline-flex items-center gap-2 text-sm select-none ${
                      isDealsRole || isAllSelected
                        ? "text-gray-800 cursor-not-allowed"
                        : "text-gray-800 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDealsRole || isAllSelected}
                      onChange={() => {
                        if (isDealsRole) return;
                        handleIndividualStateToggle(state.value);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    />
                    {state.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Timer Display Status */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">Timer Display Status</label>
            <select
              name="timerDisplayStatus"
              value={formData.timerDisplayStatus}
              onChange={handleChange}
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Offer Heading */}
          <div className="flex items-center">
            <label className="w-1/4 text-sm font-semibold text-gray-700">Offer Heading</label>
            <input
              name="offerHeading"
              value={formData.offerHeading}
              onChange={handleChange}
              placeholder="e.g. Special Holiday Discounts"
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Offer Description */}
          <div className="flex items-start">
            <label className="w-1/4 text-sm font-semibold text-gray-700 pt-2">Offer Description</label>
            <textarea
              name="offerDescription"
              value={formData.offerDescription}
              onChange={handleChange}
              rows={4}
              placeholder="Detailed description of the offer..."
              className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Top Banner Image */}
          <div className="flex items-start">
            <label className="w-1/4 text-sm font-semibold text-gray-700 pt-2">Top Banner Image</label>
            <div className="w-3/4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "topBanner")}
                className="text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
              />
              <p className="text-red-500 text-xs mt-1">Size 1578px * 117px</p>
              {topBannerPreview && (
                <div className="mt-3 relative inline-block group">
                  <img
                    src={topBannerPreview}
                    alt="Top banner preview"
                    className="max-h-24 max-w-full rounded border border-gray-200 object-contain bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage("topBanner")}
                    className="mt-1 text-xs text-red-600 hover:text-red-800 underline block"
                  >
                    Remove banner image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deals Popup Image */}
          <div className="flex items-start">
            <label className="w-1/4 text-sm font-semibold text-gray-700 pt-2">Deals Popup Image</label>
            <div className="w-3/4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "popup")}
                className="text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
              />
              {popupPreview && (
                <div className="mt-3 relative inline-block group">
                  <img
                    src={popupPreview}
                    alt="Deals popup preview"
                    className="max-h-36 max-w-xs rounded border border-gray-200 object-contain bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage("popup")}
                    className="mt-1 text-xs text-red-600 hover:text-red-800 underline block"
                  >
                    Remove popup image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t">
            <button
              type="button"
              onClick={() => router.push("/admin/offer-timer")}
              className="border px-5 py-2 rounded text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 shadow-sm font-medium transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

