"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export default function ExchangeOfferModal({
  isOpen,
  onClose,
  categoryName,
  onApply,
}) {
  const [types, setTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [conditions, setConditions] = useState([]);

  const [selectedType, setSelectedType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [pincode, setPincode] = useState("");

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isPincodeVerified, setIsPincodeVerified] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen && categoryName) {
      fetchOptions();
      // Reset state when opened
      setSelectedType("");
      setSelectedBrand("");
      setSelectedCondition("");
      setPincode("");
      setCheckResult(null);
      setIsPincodeVerified(false);
      setError("");
      setSuccessMessage("");
    }
  }, [isOpen, categoryName]);

  const fetchOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const res = await fetch(
        `/api/exchange-offers-condition/options?categoryName=${encodeURIComponent(
          categoryName
        )}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setTypes(data.data.types || []);
        setBrands(data.data.brands || []);
        setConditions(data.data.conditions || []);
      }
    } catch (err) {
      console.error("Failed to fetch options", err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handlePincodeChange = (e) => {
    const rawVal = e.target.value || "";
    // Allow numeric characters only, maximum 6 digits
    const cleaned = rawVal.replace(/\D/g, "").slice(0, 6);
    setPincode(cleaned);
    // Immediately invalidate prior verification and results
    setIsPincodeVerified(false);
    setCheckResult(null);
    setSuccessMessage("");
    if (error) setError("");
  };

  const handleDropdownChange = (setter) => (e) => {
    setter(e.target.value);
    setIsPincodeVerified(false);
    setCheckResult(null);
    setSuccessMessage("");
    if (error) setError("");
  };

  const handleCheck = async () => {
    setError("");
    setSuccessMessage("");
    setCheckResult(null);
    setIsPincodeVerified(false);

    if (
      (types.length && !selectedType) ||
      (brands.length && !selectedBrand) ||
      (conditions.length && !selectedCondition)
    ) {
      setError("Please select all required product options before checking.");
      return;
    }

    const cleanPin = String(pincode || "").trim();
    // Validate 6-digit Indian Postal Pincode format (digits only, 1-9 leading, total 6 digits)
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!cleanPin || !pinRegex.test(cleanPin)) {
      setError("Please enter a valid 6-digit pickup pincode.");
      return;
    }

    setIsChecking(true);

    try {
      const res = await fetch("/api/exchange-offers-condition/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryName,
          type: selectedType || "ANY",
          brand: selectedBrand || "ANY",
          condition: selectedCondition || "ANY",
          zone: cleanPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setCheckResult(data.data);
        setIsPincodeVerified(true);
        setSuccessMessage("Exchange pickup available for this pincode");
      } else if (data?.invalidPincode) {
        setError(data.error || "This is not a valid Indian pincode.");
      } else {
        setError(data.error || "No matching exchange offer found for your selection.");
      }
    } catch (err) {
      console.error("Failed to check offer", err);
      setError("Failed to check offer. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleApply = () => {
    if (!isPincodeVerified || !checkResult) {
      setError("Please check and verify a valid 6-digit serviceable pickup pincode first.");
      return;
    }
    onApply(checkResult);
    onClose();
  };

  if (!isOpen) return null;

  const rawPrice = Number(checkResult?.price);
  const formattedPrice = !isNaN(rawPrice)
    ? rawPrice.toLocaleString("en-IN", {
        minimumFractionDigits: rawPrice % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })
    : "0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-[#d72828]">
            Exchange your old product
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="mdi:close" className="text-xl" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600 mb-2">
            Which product would you like to exchange?
          </p>

          {types.length > 0 && (
            <select
              value={selectedType}
              onChange={handleDropdownChange(setSelectedType)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-[#d72828]"
              disabled={isLoadingOptions}
            >
              <option value="">Select Type</option>
              {types.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {brands.length > 0 && (
            <select
              value={selectedBrand}
              onChange={handleDropdownChange(setSelectedBrand)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-[#d72828]"
              disabled={isLoadingOptions}
            >
              <option value="">Select Brand</option>
              {brands.map((b, idx) => (
                <option key={idx} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}

          {conditions.length > 0 && (
            <select
              value={selectedCondition}
              onChange={handleDropdownChange(setSelectedCondition)}
              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-[#d72828]"
              disabled={isLoadingOptions}
            >
              <option value="">Select Working Condition</option>
              {conditions.map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1">
            <div className="flex gap-1.5 sm:gap-2 min-w-0">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                placeholder="Enter 6-digit pickup pincode"
                value={pincode}
                onChange={handlePincodeChange}
                className={`min-w-0 flex-1 border rounded py-2 pl-2 pr-1 sm:p-2 text-sm focus:outline-none ${
                  error
                    ? "border-red-400 focus:border-red-500"
                    : isPincodeVerified
                    ? "border-green-500 focus:border-green-600"
                    : "border-gray-300 focus:border-[#d72828]"
                }`}
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={isChecking || pincode.length !== 6}
                className="shrink-0 bg-[#d72828] text-white px-3 sm:px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? "Checking..." : "Check"}
              </button>
            </div>

            {successMessage && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                <Icon icon="mdi:check-circle" className="text-sm shrink-0" />
                <span>{successMessage}</span>
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icon icon="mdi:alert-circle-outline" className="text-sm shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {checkResult && isPincodeVerified && (
            <div className="mt-4 text-sm text-gray-700 space-y-2 border-t pt-4">
              <p className="text-xs">
                Your new product delivery will be rejected if old product does not
                work, has different model & size.
              </p>
              <p className="font-semibold text-gray-900">
                Fixed Exchange value: ₹{formattedPrice}
              </p>
              <p className="text-xs text-gray-500">
                Exchange service fee Rs. 0 will be charged
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#d72828] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!isPincodeVerified || !checkResult}
                  className="bg-[#7b519d] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#684188] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  APPLY EXCHANGE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
