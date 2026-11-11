"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FaEdit } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { OFFER_TIMER_STATES } from "@/lib/offerTimer";
import { loadDealsRoleAccess } from "@/lib/dealsRoleState";

// Safe response parser that protects against "SyntaxError: Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
async function safeJsonParse(response) {
  if (!response) {
    return { ok: false, data: null, error: "No response from server" };
  }
  try {
    const text = await response.text();
    if (!text || text.trim().startsWith("<")) {
      return {
        ok: false,
        data: null,
        error: `Server returned non-JSON response (${response.status})`,
      };
    }
    const data = JSON.parse(text);
    return { ok: response.ok, data, error: data?.error || null };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: "Unable to parse server response",
    };
  }
}

export default function StateDealsOfferSection() {
  const [deals, setDeals] = useState([]);
  const [timers, setTimers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealToDelete, setDealToDelete] = useState(null);

  // Form state
  const [selectedTimerId, setSelectedTimerId] = useState("");
  const [selectedTimerTitle, setSelectedTimerTitle] = useState("");
  const [selectedTimerRef, setSelectedTimerRef] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [isDealsRole, setIsDealsRole] = useState(false);
  const [dealsState, setDealsState] = useState("");

  // Fetch available State Deals (isolated refresh)
  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await fetch("/api/state-deals");
      const { ok, data, error } = await safeJsonParse(response);
      if (ok && data && data.success) {
        setDeals(data.data || []);
      } else {
        setErrorMessage(error || data?.error || "Failed to load state deals");
      }
    } catch (error) {
      setErrorMessage("Network error while loading state deals");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Offer Timers to populate dropdown
  const fetchTimers = async () => {
    try {
      const response = await fetch("/api/offer-timer");
      const { ok, data } = await safeJsonParse(response);
      if (ok && data && data.success) {
        setTimers(data.data || []);
      }
    } catch (error) {
      // safe no-op on network hiccups
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchTimers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDealsRoleAccess().then((access) => {
      if (cancelled) return;
      setIsDealsRole(access.isDealsRole);
      setDealsState(access.dealsState);
      setAccessReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Show temporary success message
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode("create");
    setEditingDeal(null);
    setSelectedTimerId("");
    setSelectedTimerTitle("");
    setSelectedTimerRef("");
    setSelectedState(isDealsRole ? dealsState : "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (deal) => {
    setModalMode("edit");
    setEditingDeal(deal);
    setSelectedTimerId(deal.offerTimerId ? String(deal.offerTimerId) : "");
    setSelectedTimerTitle(deal.offerTimerTitle || "");
    setSelectedTimerRef(deal.offerTimerRef || "");
    setSelectedState(deal.state || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Offer Timer Selection
  const handleTimerChange = (e) => {
    const chosenTimerId = e.target.value;
    setSelectedTimerId(chosenTimerId);
    setFormError("");

    if (!chosenTimerId) {
      setSelectedTimerTitle("");
      setSelectedTimerRef("");
      return;
    }

    const matchedTimer = timers.find(
      (t) => String(t.timerId) === String(chosenTimerId)
    );
    if (matchedTimer) {
      setSelectedTimerTitle(matchedTimer.offerTitle || "");
      setSelectedTimerRef(matchedTimer._id || "");
    }
  };

  // Filter active offer timers based on the selected state
  const availableTimers = useMemo(() => {
    if (!selectedState) return [];

    const targetState = selectedState.toLowerCase().trim();
    const stateAliases = {
      tamilnadu: ["tamilnadu", "tamil nadu", "tn"],
      andhra: ["andhra", "andhra pradesh", "ap"],
      kerala: ["kerala", "kl"],
      karnataka: ["karnataka", "ka"],
      telangana: ["telangana", "ts", "tg"],
    };
    const aliases = stateAliases[targetState] || [targetState];

    return timers.filter((t) => {
      // 1. Check active status
      const isDisplay =
        (t.timerDisplayStatus ? t.timerDisplayStatus === "Yes" : true) &&
        (t.status ? t.status === "active" : true);
      if (!isDisplay) return false;

      // 2. Check date expiration
      if (t.endDate) {
        const endMs = new Date(t.endDate).getTime();
        if (!Number.isNaN(endMs) && endMs <= Date.now()) {
          return false;
        }
      }

      // 3. In edit mode, allow the currently saved timer for this deal
      if (
        modalMode === "edit" &&
        editingDeal &&
        String(t.timerId) === String(editingDeal.offerTimerId)
      ) {
        return true;
      }

      // 4. Match 'all'
      const hasAll =
        t.state === "all" ||
        (Array.isArray(t.offerViewStates) &&
          t.offerViewStates.some((s) => String(s).toLowerCase().trim() === "all")) ||
        (Array.isArray(t.states) &&
          t.states.some((s) => String(s).toLowerCase().trim() === "all"));

      if (hasAll) return true;

      // 5. Match specific state or alias
      const timerStates = [
        ...(Array.isArray(t.offerViewStates) ? t.offerViewStates : []),
        ...(Array.isArray(t.states) ? t.states : []),
        ...(typeof t.state === "string" ? [t.state] : []),
      ].map((s) => String(s).toLowerCase().trim());

      return aliases.some((alias) => timerStates.includes(alias));
    });
  }, [timers, selectedState, modalMode, editingDeal]);

  // Handle State Selection
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setFormError("");

    // Reset selected timer if it is no longer valid for the newly selected state
    if (selectedTimerId) {
      const targetState = newState.toLowerCase().trim();
      const stateAliases = {
        tamilnadu: ["tamilnadu", "tamil nadu", "tn"],
        andhra: ["andhra", "andhra pradesh", "ap"],
        kerala: ["kerala", "kl"],
        karnataka: ["karnataka", "ka"],
        telangana: ["telangana", "ts", "tg"],
      };
      const aliases = stateAliases[targetState] || [targetState];

      const chosenTimer = timers.find((t) => String(t.timerId) === String(selectedTimerId));
      if (chosenTimer) {
        const hasAll =
          chosenTimer.state === "all" ||
          (Array.isArray(chosenTimer.offerViewStates) &&
            chosenTimer.offerViewStates.some((s) => String(s).toLowerCase().trim() === "all")) ||
          (Array.isArray(chosenTimer.states) &&
            chosenTimer.states.some((s) => String(s).toLowerCase().trim() === "all"));

        const timerStates = [
          ...(Array.isArray(chosenTimer.offerViewStates) ? chosenTimer.offerViewStates : []),
          ...(Array.isArray(chosenTimer.states) ? chosenTimer.states : []),
          ...(typeof chosenTimer.state === "string" ? [chosenTimer.state] : []),
        ].map((s) => String(s).toLowerCase().trim());

        const isMatch = hasAll || aliases.some((alias) => timerStates.includes(alias));
        if (!isMatch) {
          setSelectedTimerId("");
          setSelectedTimerTitle("");
          setSelectedTimerRef("");
        }
      } else {
        setSelectedTimerId("");
        setSelectedTimerTitle("");
        setSelectedTimerRef("");
      }
    }
  };

  // Validation: Duplicate Offer Timer + State mapping
  const isDuplicateMapping = (timerId, stateVal, excludeDealId = null) => {
    if (!timerId || !stateVal) return false;
    const numTimerId = Number(timerId);
    const normState = String(stateVal).trim().toLowerCase();

    return deals.some((d) => {
      if (excludeDealId && (d._id === excludeDealId || d.dealId === excludeDealId)) {
        return false;
      }
      return (
        Number(d.offerTimerId) === numTimerId &&
        String(d.state).trim().toLowerCase() === normState
      );
    });
  };

  // Form Submit: Add or Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedTimerId) {
      setFormError("Please select an Offer Timer.");
      return;
    }
    const stateToSave = isDealsRole ? dealsState : selectedState;
    if (!stateToSave) {
      setFormError(
        isDealsRole ? "Your account email does not include a state." : "Please select a State."
      );
      return;
    }

    // Client-side duplicate check
    const excludeId = modalMode === "edit" && editingDeal ? editingDeal._id : null;
    if (isDuplicateMapping(selectedTimerId, stateToSave, excludeId)) {
      setFormError(
        `A deal mapping for Offer Timer ID ${selectedTimerId} and State "${stateToSave}" already exists.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        offerTimerId: Number(selectedTimerId),
        offerTimerTitle: selectedTimerTitle || `Offer Timer ${selectedTimerId}`,
        offerTimerRef: selectedTimerRef || null,
        state: stateToSave.trim().toLowerCase(),
      };

      let response;
      if (modalMode === "create") {
        response = await fetch("/api/state-deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/state-deals/${editingDeal._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const { ok, data, error: parseError } = await safeJsonParse(response);

      if (ok && data && data.success) {
        setIsModalOpen(false);
        triggerSuccess(
          modalMode === "create"
            ? "State deal added successfully"
            : "State deal updated successfully"
        );
        // Isolated refresh without full page reload
        await fetchDeals();
      } else {
        setFormError(data?.error || parseError || "Failed to save state deal.");
      }
    } catch (error) {
      setFormError("An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete State Deal
  const handleDelete = async () => {
    if (!dealToDelete) return;
    try {
      const response = await fetch(`/api/state-deals/${dealToDelete._id}`, {
        method: "DELETE",
      });
      const { ok, data, error: parseError } = await safeJsonParse(response);

      if (ok && data && data.success) {
        triggerSuccess("State deal deleted successfully");
        // Isolated refresh without full page reload
        await fetchDeals();
      } else {
        alert(data?.error || parseError || "Failed to delete state deal");
      }
    } catch (error) {
      alert("Error deleting state deal");
    } finally {
      setDealToDelete(null);
    }
  };

  // Filtered deals based on search
  const stateScopedDeals = useMemo(() => {
    if (!isDealsRole) return deals;
    if (!dealsState) return [];
    return deals.filter((deal) => String(deal.state || "").toLowerCase() === dealsState);
  }, [deals, isDealsRole, dealsState]);

  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return stateScopedDeals;
    const q = searchQuery.toLowerCase().trim();
    return stateScopedDeals.filter((d) => {
      const idMatch = d.dealId && String(d.dealId).toLowerCase().includes(q);
      const timerIdMatch =
        d.offerTimerId && String(d.offerTimerId).toLowerCase().includes(q);
      const titleMatch =
        d.offerTimerTitle && d.offerTimerTitle.toLowerCase().includes(q);
      const stateMatch = d.state && d.state.toLowerCase().includes(q);
      return idMatch || timerIdMatch || titleMatch || stateMatch;
    });
  }, [stateScopedDeals, searchQuery]);

  return (
    <div className="container mx-auto">
      {/* Toast / Success Notification */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-[70] bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in transition-all">
          <Icon icon="mdi:check-circle" className="w-5 h-5 text-white" />
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {/* Main Card Container */}
      <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto">
        {/* Header Row: Title & Action Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h2 className="text-2xl font-light text-gray-700 tracking-tight">
            States Deals Offer Show
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative">
              <input
                type="text"
                placeholder="Search state deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-3 py-1.5 rounded text-sm w-48 sm:w-60 focus:outline-none focus:border-blue-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={handleOpenAddModal}
              className="border px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium shadow-xs transition-colors whitespace-nowrap"
            >
              <Icon icon="ic:baseline-add" className="w-4 h-4 text-gray-600" />
              <span>New State Deal</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm flex justify-between items-center">
            <span>{errorMessage}</span>
            <button
              onClick={fetchDeals}
              className="text-xs font-semibold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading || !accessReady ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Icon icon="svg-spinners:180-ring-with-bg" className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm">Loading State Deals...</p>
          </div>
        ) : (
          /* Table */
          <table className="w-full border border-gray-200 min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-700 text-sm">
                <th className="p-3 text-left pl-4 font-semibold w-20">Id</th>
                <th className="p-3 text-left font-semibold">Offer Timer</th>
                <th className="p-3 text-left font-semibold w-40">Offer Timer ID</th>
                <th className="p-3 text-left font-semibold">State</th>
                <th className="p-3 text-center font-semibold w-36">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-200">
              {filteredDeals.length > 0 ? (
                filteredDeals.map((deal) => (
                  <tr key={deal._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-left pl-4 font-medium text-gray-900">
                      {deal.dealId}
                    </td>
                    <td className="p-3 text-left text-gray-800">
                      {deal.offerTimerTitle}
                    </td>
                    <td className="p-3 text-left text-gray-600 font-mono text-xs sm:text-sm">
                      {deal.offerTimerId}
                    </td>
                    <td className="p-3 text-left text-gray-700">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                        {deal.state}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => handleOpenEditModal(deal)}
                          className="px-2.5 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-xs transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-3 h-3 text-gray-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDealToDelete(deal)}
                          className="px-2.5 py-1.5 rounded bg-[#d9534f] hover:bg-red-600 text-white flex items-center gap-1 text-xs font-medium shadow-xs transition-colors"
                          title="Delete"
                        >
                          <Icon icon="mingcute:delete-2-line" className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Icon icon="mdi:tag-off-outline" className="w-8 h-8 text-gray-400" />
                      <p className="font-medium text-gray-600">
                        {searchQuery
                          ? `No state deals matching "${searchQuery}"`
                          : "No state deals found"}
                      </p>
                      {!searchQuery && (
                        <p className="text-xs text-gray-400">
                          Click &quot;+ New State Deal&quot; above to create a mapping.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal - Exactly cloned from Reference Screenshots */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 pt-16 sm:pt-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl max-w-lg w-full overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 flex justify-between items-center bg-white">
              <h3 className="text-xl font-normal text-[#333333]">
                {modalMode === "create"
                  ? "Add States Deals Offer Show"
                  : "Edit States Deals Offer Show"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-4">
                {formError && (
                  <div className="p-2.5 bg-[#f2dede] border border-[#ebccd1] text-[#a94442] text-xs rounded">
                    {formError}
                  </div>
                )}

                {/* 1. State Select (Matches Screenshot 1 & 2) */}
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                    State
                  </label>
                  <select
                    value={isDealsRole ? dealsState : selectedState}
                    onChange={(e) => {
                      if (isDealsRole) return;
                      handleStateChange(e);
                    }}
                    className="w-full border border-[#cccccc] rounded px-3 py-2 text-sm text-[#333333] bg-white focus:outline-none focus:border-[#66afe9] focus:ring-1 focus:ring-[#66afe9]"
                    required
                  >
                    {!isDealsRole && <option value="">-- Select State --</option>}
                    {(isDealsRole
                      ? OFFER_TIMER_STATES.filter((state) => state.value === dealsState)
                      : [
                          { value: "tamilnadu", label: "Tamilnadu" },
                          { value: "andhra", label: "Andhra" },
                          { value: "kerala", label: "Kerala" },
                          { value: "karnataka", label: "Karnataka" },
                          { value: "telangana", label: "Telangana" },
                        ]
                    ).map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Offer Timer Select (Filtered by Selected State) */}
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                    Offer Timer
                  </label>
                  <select
                    value={selectedTimerId}
                    onChange={handleTimerChange}
                    className="w-full border border-[#cccccc] rounded px-3 py-2 text-sm text-[#333333] bg-white focus:outline-none focus:border-[#66afe9] focus:ring-1 focus:ring-[#66afe9]"
                    required
                  >
                    <option value="">
                      {!selectedState
                        ? "-- Select Offer Timer --"
                        : availableTimers.length === 0
                        ? "-- No Active Offer Timers for this State --"
                        : "-- Select Offer Timer --"}
                    </option>
                    {availableTimers.map((t) => (
                      <option key={t._id} value={t.timerId}>
                        {t.offerTitle || `Offer #${t.timerId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer Buttons (Matches Screenshot 1 & 2) */}
              <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-2.5 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 border border-[#cccccc] bg-white hover:bg-[#e6e6e6] text-[#333333] rounded text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-1.5 bg-[#5cb85c] hover:bg-[#449d44] border border-[#4cae4c] text-white rounded text-sm font-normal transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Icon
                      icon="svg-spinners:180-ring-with-bg"
                      className="w-3.5 h-3.5 text-white"
                    />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete state deal #{dealToDelete.dealId} for{" "}
              <strong className="text-gray-800">{dealToDelete.offerTimerTitle}</strong> (
              {dealToDelete.state})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDealToDelete(null)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-100 text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-[#d9534f] hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
