"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * usePaymentOffersModal Hook
 * Provides isolated state management for EMI and Bank Offers modals & card selections.
 *
 * @param {Object} options
 * @param {boolean} [options.externalShowEmiModal]
 * @param {Function} [options.onExternalCloseEmiModal]
 */
export function usePaymentOffersModal({
  externalShowEmiModal = false,
  onExternalCloseEmiModal,
} = {}) {
  // activeModal: 'emi' | 'bank' | null
  const [internalActiveModal, setInternalActiveModal] = useState(null);
  const [selectedBankKey, setSelectedBankKey] = useState("all");
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [selectedEMIOffer, setSelectedEMIOffer] = useState(null);

  // Synchronize with externalShowEmiModal prop if provided
  const activeModal = externalShowEmiModal ? "emi" : internalActiveModal;
  const isEmiModalOpen = activeModal === "emi";
  const isBankOffersModalOpen = activeModal === "bank";

  const openEmiModal = useCallback((offerOrBankKey) => {
    if (typeof offerOrBankKey === "string") {
      setSelectedBankKey(offerOrBankKey.toLowerCase());
      setSelectedEMIOffer(null);
    } else if (offerOrBankKey && typeof offerOrBankKey === "object") {
      const bankCode = (
        offerOrBankKey.bankShortCode ||
        offerOrBankKey.bankCode ||
        "all"
      ).toLowerCase();
      setSelectedBankKey(bankCode);
      setSelectedEMIOffer(offerOrBankKey);
      if (offerOrBankKey.offerId) {
        setSelectedOfferId(offerOrBankKey.offerId);
      }
    } else {
      setSelectedBankKey("all");
      setSelectedEMIOffer(null);
    }
    setInternalActiveModal("emi");
  }, []);

  const openBankOffersModal = useCallback((offer) => {
    if (offer && typeof offer === "object" && offer.offerId) {
      setSelectedOfferId(offer.offerId);
    }
    setInternalActiveModal("bank");
  }, []);

  const closeModal = useCallback(() => {
    setInternalActiveModal(null);
    if (typeof onExternalCloseEmiModal === "function") {
      onExternalCloseEmiModal();
    }
  }, [onExternalCloseEmiModal]);

  const selectOffer = useCallback((offerId) => {
    setSelectedOfferId(offerId);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, closeModal]);

  return {
    activeModal,
    isEmiModalOpen,
    isBankOffersModalOpen,
    selectedBankKey,
    setSelectedBankKey,
    selectedOfferId,
    selectedEMIOffer,
    openEmiModal,
    openBankOffersModal,
    closeModal,
    selectOffer,
  };
}

export default usePaymentOffersModal;
