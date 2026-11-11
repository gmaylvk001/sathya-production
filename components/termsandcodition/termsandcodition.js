"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { 
    FiFileText, 
    FiRefreshCw, 
    FiXCircle, 
    FiCreditCard, 
    FiDollarSign, 
    FiShield, 
    FiUserCheck, 
    FiAward, 
    FiPhoneCall, 
    FiMessageSquare,
    FiCheckCircle,
    FiAlertTriangle,
    FiLock,
    FiTruck
} from 'react-icons/fi';
import { RiBankCardLine, RiSecurePaymentLine } from 'react-icons/ri';
import { MdOutlineCancelPresentation, MdOutlineSecurity } from 'react-icons/md';

const TermsAndConditions = () => {
    const [currentDate, setCurrentDate] = useState('');
    const [activeSection, setActiveSection] = useState('refunds-replacement');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
    }, []);

    const navItems = [
        { id: "refunds-replacement", label: "Refunds & Replacement" },
        { id: "cancellation", label: "Terms for Cancellation" },
        { id: "payment-options", label: "Payment Options & COD" },
        { id: "trademark", label: "Trademark & Intellectual Property" },
        { id: "account", label: "Account & Marketplace Warranty" },
        { id: "applicable-law", label: "Applicable Law & Jurisdiction" },
        { id: "communication", label: "Omnichannel Communications" },
    ];

    // ScrollSpy: Automatically highlight active section on the left as user scrolls the page
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
                        <span className="text-[#d72828] font-semibold">Terms and Conditions</span>
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
                                    <FiFileText size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-[#111827] leading-tight">Terms & Conditions</h2>
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

                            {/* Customer Care Box */}
                            <div className="mt-5 pt-4 border-t border-gray-100 bg-gradient-to-br from-[#FFF5F5] to-red-50/30 rounded-xl p-3.5 text-center border border-red-100/70">
                                <div className="w-8 h-8 rounded-full bg-red-100 text-[#d72828] flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                                    <FiPhoneCall size={15} />
                                </div>
                                <h4 className="text-xs font-bold text-[#111827]">Customer Care Helpline</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5 mb-2">Mon - Sat: 9:30 AM – 7:30 PM</p>
                                <a 
                                    href="tel:+918880598985" 
                                    className="inline-flex items-center justify-center gap-1.5 w-full bg-[#d72828] hover:bg-[#b81d1d] text-white text-xs font-bold py-2 rounded-lg transition shadow-xs"
                                >
                                    📞 +91 8880598985
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
                                Sathya Legal & Customer Terms
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111827] tracking-tight leading-tight mb-2">
                                Terms and Conditions
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                                Please read these terms and conditions carefully before placing an order or using our website services at Sathya Agencies Limited.
                            </p>
                        </div>

                        {/* 1. Terms and Condition for Refunds and Replacement */}
                        <section id="refunds-replacement" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiRefreshCw size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Terms and Condition for Refunds and Replacement</h2>
                            </div>

                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    All products sold at <strong className="text-gray-900">www.sathya.store</strong> are covered under our <strong>3 day Replacement Guarantee</strong>. Please do notify us on any problems, damages or defects within 3 days from the date of delivery, and we will issue a brand new replacement product to you at no extra cost.
                                </p>
                                <p>
                                    In order to get a defective item replaced please do Contact Customer Care via the Contact Us Page or call us on <strong className="text-gray-900">+91 8880598985</strong> Monday to Saturday 9.30am to 7.30 pm IST, within 3 days from the date of delivery. The defective product or part will be recalled and a replacement will be shipped immediately. If there is any cosmetic damage we will not replace the product. However if there is any other concern you can still get in touch with us.
                                </p>
                                <p>
                                    During the replacement process the product that is being returned should contain all original packaging and accessories, including the retail box, manuals, cables, and all other items originally included with the product at the time of delivery.
                                </p>
                                <p>
                                    Product without a valid, readable, untampered serial number, including but not limited to products with missing, damaged, altered, or otherwise unreadable serial number will not be eligible for replacement.
                                </p>
                                
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                                    <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-bold">Transit Insurance & Damaged Packages</p>
                                        <p className="mt-1 leading-relaxed">
                                            All electronics are <strong>Insured against theft and damages incurred during transit</strong>. If you receive a package that is open or looks to have been tampered with, do not accept it. Contact Sathya Customer Care on <strong>+91 8880598985</strong> (Monday to Saturday 9am to 9pm IST), and we will have the issue quickly resolved.
                                        </p>
                                    </div>
                                </div>

                                <p>
                                    For orders placed through Gift Coupons /vouchers, refund would be provided in form of a fresh Gift Coupons /voucher of the same value and the Expiry date will be the same as in the original gift coupons.
                                </p>
                                <p>
                                    It may take up to <strong>7-10 working days</strong> to complete the refund from the time we have received our product back. Though we give free shipping during the cancel and refund the shipping charge will be deducted from the refund amount. If the order is cancelled before shipping there will not be any shipping charge deducted on the refund funds. In case if the payment was done through COD, it will take longer. As soon as we receive the funds from the courier we will process the refund.
                                </p>

                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Required Information for COD / Direct Bank Refund:</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-700">
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• Name as on Account</span>
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• Name of Bank</span>
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• Account Number</span>
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• IFSC Code</span>
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• Order Number</span>
                                        <span className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-medium">• Reason for Refund</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2.5">
                                        We will either transfer the funds directly to your account or provide a cheque under the billing address name.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 2. Terms and Condition for Cancellation */}
                        <section id="cancellation" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <MdOutlineCancelPresentation size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Terms and Condition for Cancellation</h2>
                            </div>

                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    If you cancel your order before your product has been shipped, we will refund the entire amount.
                                </p>
                                <p>
                                    If the cancellation is after your product has been shipped: If your product has shipped but has not yet been delivered, contact Customer Support and inform them of the same. If you received the product, it will only be eligible for replacement, only in cases where there are defects found with the product.
                                </p>
                                <p>
                                    When the product is been delivered by courier and the customer does not accept the package, the <strong>2 way shipment charge</strong> will be collected from the Customer.
                                </p>
                            </div>
                        </section>

                        {/* 3. Terms and Condition for the Payment */}
                        <section id="payment-options" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiCreditCard size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Terms and Condition for the Payment</h2>
                            </div>

                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    Please make the payment to the respective courier delivery person after you have received the product. The invoice for the purchase will be in the package and a mail for the order placed will be sent out to you.
                                </p>

                                <div className="pt-2">
                                    <h3 className="font-bold text-[#111827] text-base mb-3">Payment Options in Sathya.store</h3>
                                    
                                    {/* Available Options */}
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Following Payment Options Are Available:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {["Credit Card", "Debit Card", "Net Banking", "Cash Card", "Cash on Delivery (COD)", "RTGS & NEFT (within India)"].map((opt, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                                                    <FiCheckCircle size={13} className="text-emerald-600" /> {opt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Unsupported Options */}
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">You Will Not Be Able to Make Any Payment Using:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {["Mobile Payment options (mChek)", "Payment by DD"].map((opt, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-1.5">
                                                    <FiXCircle size={13} className="text-rose-600" /> {opt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Breakdown Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4">
                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                            <h4 className="text-xs font-bold text-[#111827] mb-1.5 flex items-center gap-2">
                                                <RiBankCardLine className="text-[#d72828]" /> Debit Cards Accepted
                                            </h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Visa, Master Card, Maestro, Rupay (All major Visa, Master and Maestro Debit cards).
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                            <h4 className="text-xs font-bold text-[#111827] mb-1.5 flex items-center gap-2">
                                                <FiCreditCard className="text-[#d72828]" /> Credit Cards Accepted
                                            </h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Visa, Master Card, American Express, JCB, American Express Eze Click, EBS Credit Card (All Visa credit cards National - India).
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                            <h4 className="text-xs font-bold text-[#111827] mb-1.5 flex items-center gap-2">
                                                <FiDollarSign className="text-[#d72828]" /> Cash Cards Accepted
                                            </h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                ICash, ItzCash, Jio Money, MobiKwik, PayCash, PayZapp, YPayCash.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                            <h4 className="text-xs font-bold text-[#111827] mb-1.5 flex items-center gap-2">
                                                <RiSecurePaymentLine className="text-[#d72828]" /> Supported EMI Options
                                            </h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                HDFC Bank Visa Card, HDFC Bank Master Card, CITI Bank Visa Card, CITI Bank Master Card, Bajaj Finserv (No Cost EMI).
                                            </p>
                                        </div>
                                    </div>

                                    {/* Security Guarantee Banner */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border border-emerald-200 flex items-start gap-3 my-4">
                                        <FiShield className="text-emerald-600 shrink-0 mt-1" size={22} />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-950">100% Safe & Certified Online Shopping</h4>
                                            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                                                Shopping at <strong>www.sathya.store</strong> is 100% safe. We are a Verisign Secured SSL certified site which gives maximum security to the users. All the online payments are made through our payment gateway EBS which is approved by <strong>McAfee Secure, Verisign by Norton secure, PCI Security Standards and ISO 27001 Certified</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* What is COD? */}
                                    <div className="mt-5 pt-4 border-t border-gray-100">
                                        <h4 className="font-bold text-[#111827] text-base mb-2">What is Cash on Delivery (COD)?</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-2">
                                            Cash on delivery (COD) is a payment option in which at the time of delivery you hand over the CASH against delivery of the product. The product will be delivered in a sealed condition.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 mt-3">
                                            <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-100 font-medium text-red-900">
                                                ⚠️ Please DO NOT accept any packet which appears to be tampered or damaged externally.
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 font-medium text-emerald-900">
                                                ✓ Please DO NOT pay more than the order value. You pay for what you see with no hidden charges.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. Trademark */}
                        <section id="trademark" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiAward size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Trademark</h2>
                            </div>

                            <div className="space-y-3.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    The logo / image of <strong>Sathya Agencies Limited</strong> on the home page of the website & other pages and as used in the communication to the User is licensed by Sathya Agencies Limited and cannot be used or communicated or distributed without prior written consent.
                                </p>
                            </div>
                        </section>

                        {/* 5. Account & Marketplace Warranty */}
                        <section id="account" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiUserCheck size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Account & Marketplace Warranty</h2>
                            </div>

                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    If you use this site, you are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer, and also you agree to accept responsibility for all activities that occur under your account or password.
                                </p>
                                <p>
                                    Sathya Agencies Limited does sell products to children, but it sells them to adults, who can purchase with a credit/Debit card or COD. If you are under 18, you may use Sathya Agencies Limited only with involvement of a parent or guardian or otherwise, Sathya Agencies Limited has the right to cancel any order or service to the User. Sathya Agencies Limited and its affiliates reserve the right to refuse service, terminate accounts, remove or edit content, or cancel orders in their sole discretion.
                                </p>
                                <p>
                                    Sathya Agencies Limited is associated with various business partners for the supply and service of goods directly to the customers. SATHYA Agencies Limited is a marketplace for the products with its business partners. The after sales service and warranty for the products sold by our business partners, as duly applicable, for the respective products, will be taken undertaken and handled by the respective business partners or through their respective service centers.
                                </p>
                            </div>
                        </section>

                        {/* 6. Applicable Law & Jurisdiction */}
                        <section id="applicable-law" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <MdOutlineSecurity size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Applicable Law & Jurisdiction</h2>
                            </div>

                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    This site is created and controlled by <strong>SATHYA Agencies Limited</strong>. The laws of India shall apply and courts in <strong>Tuticorin</strong> shall have jurisdiction in respect of all the terms, conditions and disclaimers. SATHYA Agencies Limited reserves the right to make changes to the website and the terms, conditions and disclaimers at any time and without any prior information provided to the customers/users of the services/website of SATHYA Agencies Limited.
                                </p>
                                <p>
                                    This Agreement shall be governed by and interpreted and construed in accordance with the laws of India. The place of jurisdiction shall be in <strong>Tuticorin, Tamil Nadu</strong>.
                                </p>
                                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 font-semibold flex items-center gap-2">
                                    <FiCheckCircle className="text-emerald-600 shrink-0" size={18} />
                                    <span>Please Note: All products sold on sathya.store / SATHYA Agencies Limited are brand new and 100% genuine.</span>
                                </div>
                            </div>
                        </section>

                        {/* 7. Terms and Conditions for Communication */}
                        <section id="communication" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiMessageSquare size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Terms and Conditions for Communication</h2>
                            </div>

                            <div className="space-y-3.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    Acceptance to receive communications (Promotional and Transactional) through omni channels (Emails, SMS, WhatsApp, Telephone etc.) from the Sathya Agencies Limited., its affiliates and third party vendors.
                                </p>
                            </div>
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;