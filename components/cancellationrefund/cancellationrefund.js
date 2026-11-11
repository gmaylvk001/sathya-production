"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { 
    FiRotateCcw, 
    FiShield, 
    FiMail, 
    FiPhone, 
    FiUser, 
    FiClock, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiTruck, 
    FiRefreshCw, 
    FiFileText,
    FiHelpCircle,
    FiPackage
} from 'react-icons/fi';
import { MdOutlineCancelPresentation, MdOutlineAssignmentReturn } from 'react-icons/md';

const CancellationRefund = () => {
    const [currentDate, setCurrentDate] = useState('');
    const [activeSection, setActiveSection] = useState('cancellation');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
    }, []);

    const navItems = [
        { id: "cancellation", label: "Terms for Cancellation" },
        { id: "return-refund", label: "Return & Refund Policy" },
        { id: "support-grievance", label: "Customer Support & Grievance" },
    ];

    // Automatic ScrollSpy: Highlight active topic in the left menu as user scrolls
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const offset = 150;

            for (let i = navItems.length - 1; i >= 0; i--) {
                const item = navItems[i];
                const el = document.getElementById(item.id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const elementTop = rect.top + scrollY;
                    if (scrollY >= elementTop - offset) {
                        setActiveSection(item.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Smooth scroll to target section when clicking a sidebar item
    const scrollToSection = (id) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 110;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="bg-[#fcfdfd] min-h-screen">
            {/* 🔴 Breadcrumb Header */}
            <div className="bg-red-50/80 py-3.5 px-4 sm:px-8 border-b border-red-100/70">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                        <Link href="/" className="text-gray-600 hover:text-[#d72828] transition font-medium">🏠 Home</Link>
                        <span className="text-gray-400">›</span>
                        <span className="text-[#d72828] font-semibold">Cancellation & Refund Policy</span>
                    </div>
                    {currentDate && (
                        <span className="text-xs text-gray-500 hidden sm:inline-block">
                            Last Updated: {currentDate}
                        </span>
                    )}
                </div>
            </div>

            {/* 📄 Main Content Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* 📌 Left Side Menu - Sticky Navigation in Viewport */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-28 self-start z-10">
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            
                            {/* Brand / Title inside Sidebar */}
                            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0 shadow-xs border border-red-100">
                                    <FiRotateCcw size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-[#111827] leading-tight">Cancellation Policy</h2>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Sathya Agencies Limited</p>
                                </div>
                            </div>

                            {/* Section Navigation Header */}
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Quick Menu
                                </span>
                                <span className="text-[10px] bg-red-50 text-[#d72828] font-bold px-2 py-0.5 rounded-full border border-red-100">
                                    {navItems.length} Topics
                                </span>
                            </div>

                            {/* Navigation Buttons */}
                            <nav className="space-y-1">
                                {navItems.map((item, idx) => {
                                    const isActive = activeSection === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => scrollToSection(item.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-between group ${
                                                isActive 
                                                    ? "bg-[#d72828] text-white shadow-md shadow-red-500/20" 
                                                    : "text-gray-600 hover:bg-red-50/70 hover:text-[#d72828]"
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5 truncate">
                                                <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shrink-0 ${
                                                    isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-red-100 group-hover:text-[#d72828]"
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </span>
                                            <span className={`text-xs transition-transform ${isActive ? "translate-x-0.5 text-white" : "opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5"}`}>
                                                →
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Quick Support Box */}
                            <div className="mt-5 pt-4 border-t border-gray-100 bg-gradient-to-br from-[#FFF5F5] to-red-50/30 rounded-xl p-3.5 text-center border border-red-100/70">
                                <div className="w-8 h-8 rounded-full bg-red-100 text-[#d72828] flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                                    <FiPhone size={15} />
                                </div>
                                <h4 className="text-xs font-bold text-[#111827]">Grievance Support</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5 mb-2.5">Need urgent order assistance?</p>
                                <a 
                                    href="tel:9894024985" 
                                    className="inline-flex items-center justify-center gap-1.5 w-full bg-[#d72828] hover:bg-[#b81d1d] text-white text-xs font-bold py-2 rounded-lg transition shadow-xs mb-1.5"
                                >
                                    📞 9894024985
                                </a>
                                <a 
                                    href="mailto:crm@sathya.email" 
                                    className="inline-block text-[11px] font-bold text-[#d72828] hover:underline"
                                >
                                    crm@sathya.email
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* 📜 Right Content Stream (Main Scrolling Area) */}
                    <main className="lg:col-span-8 space-y-6">

                        {/* Top Hero Banner in Right Pane */}
                        <div className="bg-gradient-to-br from-red-50/60 via-white to-[#FFF5F5] rounded-2xl border border-red-100/80 p-6 sm:p-8 shadow-xs">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/80 text-[#d72828] text-xs font-bold mb-3 border border-red-200/60">
                                <FiShield size={14} />
                                Sathya Customer Protection
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111827] tracking-tight leading-tight mb-2">
                                Cancellation, Return & Refund Policy
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                                Simple terms for order cancellations, hassle-free returns, and prompt refunds for products purchased online or at Sathya stores.
                            </p>
                        </div>

                        {/* 1. Terms and Conditions for Cancellation */}
                        <section id="cancellation" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <MdOutlineCancelPresentation size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Terms and Conditions for Cancellation</h2>
                            </div>
                            
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    Cancellations will be taken into consideration at any time before the delivery of product. If you cancel your order before it has been shipped, we will refund the entire amount.
                                </p>
                                <p>
                                    Cancellation will not be accepted for orders placed under the <strong>Same Day Delivery</strong> category.
                                </p>
                                <p>
                                    If your product has shipped but has not yet been delivered, contact Customer Support and inform them of the same. If you have received the product, it will only be eligible for replacement in cases where there are defects found with the product.
                                </p>
                                <p>
                                    When the product is delivered by courier and the customer does not accept the package, the <strong>2-way shipment charge</strong> will be collected from the customer.
                                </p>
                            </div>

                            {/* Summary Checklist Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-gray-100">
                                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                                    <FiCheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950">100% Full Refund Before Shipping</p>
                                        <p className="text-[11px] text-emerald-800 mt-0.5">Cancel before order dispatch for complete refund.</p>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-2.5">
                                    <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-xs font-bold text-amber-950">Same Day Delivery Orders</p>
                                        <p className="text-[11px] text-amber-800 mt-0.5">Cancellations not accepted once booked.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. The Return and Refund Policy */}
                        <section id="return-refund" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <MdOutlineAssignmentReturn size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">The Return and Refund Policy</h2>
                            </div>
                            
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    There could be certain circumstances beyond our control where you could receive a damaged product or a product that is not the same as per the visualization on the website. Sathya Agencies Limited has always try their best to help you with a replacement or refund.
                                </p>
                                <p>
                                    The products sold by Sathya Agencies Limited can be returned or exchanged within <strong>30 days</strong> from the date of your in-store purchase or <strong>30 days</strong> from the date your online order is delivered.
                                </p>
                            </div>

                            {/* 30 Days Replacement / Refund Banner */}
                            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-red-50 via-[#FFF5F5] to-red-50/40 border border-red-200 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-[#d72828] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                    30D
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-[#111827]">30 Days Return & Exchange Window</h4>
                                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                        Valid for 30 days from in-store purchase date or online delivery date for defective or damaged goods.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 3. Customer Support & Grievance Officer */}
                        <section id="support-grievance" className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-[#FFF5F5] via-[#FFF9F9] to-[#FFF0F0] p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-[#d72828] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                                    <FiUser size={24} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#d72828]">Customer Support</span>
                                    <h2 className="text-xl sm:text-2xl font-black text-[#111827]">Grievance Officer & Support</h2>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 leading-relaxed mb-6">
                                In case of any escalation of customer service enquiries with regards to defects in products or complaints with services, you are free to contact our grievance officer at the below address:
                            </p>

                            <div className="bg-white rounded-xl border border-red-100 p-5 sm:p-6 shadow-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-3">
                                        <FiUser className="text-[#d72828] mt-1 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Name</p>
                                            <p className="text-sm font-bold text-[#111827]">Mr. Francis Prabhu</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <FiMail className="text-[#d72828] mt-1 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Email Address</p>
                                            <a href="mailto:crm@sathya.email" className="text-sm font-bold text-[#d72828] hover:underline">
                                                crm@sathya.email
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <FiPhone className="text-[#d72828] mt-1 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Phone</p>
                                            <a href="tel:9894024985" className="text-sm font-bold text-[#111827] hover:text-[#d72828]">
                                                9894024985
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default CancellationRefund;