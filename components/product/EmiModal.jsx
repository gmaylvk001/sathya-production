'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BankLogo from './BankLogo';
import { getAllEmiPlans } from '@/lib/emiCalculator';

/**
 * EmiModal Component
 *
 * Razorpay-style EMI Plans Drawer & Modal matching the Sathya Store live experience.
 * Features:
 * - Desktop: Slide-over right drawer with backdrop blur.
 * - Mobile: Bottom sheet drawer with swipe/dismiss indicator.
 * - Tabs: Credit Card EMI vs Other EMIs (Debit / Cardless).
 * - Accordion: Expands bank tenures, showing monthly installment and interest rates.
 * - Minimum threshold validation: "available for orders above ₹1500" for ineligible banks.
 * - Esc key, backdrop click, and close button handling.
 * - Scroll lock on document.body during presentation.
 *
 * @param {{ isOpen: boolean, onClose: () => void, price: number, productName?: string }} props
 */
export default function EmiModal({ isOpen, onClose, price, productName = '' }) {
  const [activeTab, setActiveTab] = useState('credit'); // 'credit' | 'other'
  const [expandedBankCode, setExpandedBankCode] = useState(null);

  const numericPrice = Number(price) || 0;

  // Resolve all calculated EMI plans
  const { creditCardPlans, otherPlans } = useMemo(() => {
    return getAllEmiPlans(numericPrice);
  }, [numericPrice]);

  const activePlans = activeTab === 'credit' ? creditCardPlans : otherPlans;

  // Auto-expand the first eligible bank by default
  useEffect(() => {
    if (isOpen) {
      const firstEligible = activePlans.find((p) => p.isEligible);
      setExpandedBankCode(firstEligible ? firstEligible.bankCode : null);
    }
  }, [isOpen, activeTab, activePlans]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggleBankAccordion = useCallback((bankCode, isEligible) => {
    if (!isEligible) return;
    setExpandedBankCode((prev) => (prev === bankCode ? null : bankCode));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Drawer Container: Desktop Right Slide-Over / Mobile Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emi-modal-title"
        className="relative z-10 w-full bg-white shadow-2xl flex flex-col overflow-hidden
                   fixed inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl animate-in slide-in-from-bottom duration-300
                   sm:relative sm:inset-auto sm:h-full sm:max-h-full sm:w-[460px] sm:max-w-md sm:rounded-none sm:animate-in sm:slide-in-from-right duration-300"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-3 sm:pt-5 pb-3 border-b border-gray-100 flex items-start justify-between bg-white">
          <div className="flex-1 pr-3">
            <h2 id="emi-modal-title" className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">
              EMI Options
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Available on payments made via{' '}
              <span className="font-semibold text-gray-700">Razorpay</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Razorpay stylized card/notes badge */}
            <div className="hidden sm:flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 text-[11px] font-semibold">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H3V6h18v12zm-4-7h2v2h-2zm-4 0h2v2h-2zm-4 0h2v2H9z" />
              </svg>
              <span>Instant Approval</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close EMI options modal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Order Price Summary Bar */}
        <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-200/70 flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium truncate max-w-[240px]" title={productName}>
            {productName ? productName : 'Selected Product'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-gray-500">Order Value:</span>
            <span className="font-bold text-gray-900 text-sm">
              ₹{numericPrice.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white px-5 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('credit')}
            className={`pb-2.5 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'credit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Credit Card EMI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            className={`pb-2.5 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'other'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Other EMIs
          </button>
        </div>

        {/* Bank List & Tenures (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 sm:p-3">
          {activePlans.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No EMI plans available for this order value.
            </div>
          ) : (
            activePlans.map((bank) => {
              const isExpanded = expandedBankCode === bank.bankCode && bank.isEligible;

              return (
                <div
                  key={`${bank.bankCode}-${bank.bankName}`}
                  className={`rounded-xl transition-all my-1 overflow-hidden ${
                    bank.isEligible
                      ? isExpanded
                        ? 'bg-blue-50/30 border border-blue-100 shadow-2xs'
                        : 'hover:bg-gray-50 border border-transparent'
                      : 'opacity-70 bg-gray-50/50'
                  }`}
                >
                  {/* Bank Header Accordion Bar */}
                  <div
                    role={bank.isEligible ? 'button' : 'region'}
                    tabIndex={bank.isEligible ? 0 : -1}
                    onClick={() => toggleBankAccordion(bank.bankCode, bank.isEligible)}
                    onKeyDown={(e) => {
                      if (bank.isEligible && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        toggleBankAccordion(bank.bankCode, bank.isEligible);
                      }
                    }}
                    aria-expanded={isExpanded}
                    className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 ${
                      bank.isEligible ? 'cursor-pointer select-none' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Bank Logo */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white border border-gray-100 shadow-2xs p-0.5">
                        <BankLogo
                          bankCode={bank.bankCode}
                          bankName={bank.bankName}
                          logoUrl={bank.logoUrl}
                          size={28}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {bank.bankName}
                        </span>
                        {bank.isEligible ? (
                          <span className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                            from{' '}
                            <strong className="text-gray-800 font-semibold">
                              ₹{bank.lowestEmi?.toLocaleString('en-IN')}/month
                            </strong>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            {bank.ineligibilityReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron for Eligible Banks */}
                    {bank.isEligible && (
                      <div className="text-gray-400 shrink-0">
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-blue-600' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Expanded Tenures Table */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-blue-100/70">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-200 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-2 px-3">Plan (Tenure @ Rate)</th>
                              <th className="py-2 px-3 text-right">Monthly EMI</th>
                              <th className="py-2 px-3 text-right hidden sm:table-cell">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {bank.tenurePlans.map((plan) => (
                              <tr key={plan.tenure} className="hover:bg-blue-50/20 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="font-semibold text-gray-900">
                                      {plan.tenure} EMIs
                                    </span>
                                    <span className="text-gray-400">@</span>
                                    <span className="text-gray-600">{plan.rate}% p.a.</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                  ₹{plan.monthlyEmi.toLocaleString('en-IN')}{' '}
                                  <span className="text-[10px] text-gray-400 font-normal">/ mo</span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-gray-500 hidden sm:table-cell whitespace-nowrap">
                                  ₹{plan.totalCost.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer / Legal Notice */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 leading-normal">
          <div className="flex items-start gap-1.5">
            <span className="text-blue-500 font-bold shrink-0">ℹ</span>
            <p>
              Interest rates and minimum orders are set by respective banks. Final charges, processing fees,
              and applicable taxes will be displayed on the Razorpay payment gateway screen at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
