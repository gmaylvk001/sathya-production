"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { 
    FiShield, 
    FiLock, 
    FiMail, 
    FiPhone, 
    FiMapPin, 
    FiClock, 
    FiUser, 
    FiFileText, 
    FiCheckCircle, 
    FiExternalLink, 
    FiAlertCircle, 
    FiAward, 
    FiDatabase,
    FiShare2,
    FiEyeOff
} from 'react-icons/fi';
import { BiCookie } from 'react-icons/bi';
import { RiSecurePaymentLine } from 'react-icons/ri';

const PrivacyPolicy = () => {
    const [currentDate, setCurrentDate] = useState('');
    const [activeSection, setActiveSection] = useState('intro');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
    }, []);

    const navItems = [
        { id: "intro", label: "Overview & Commitment" },
        { id: "collection", label: "Information Collection" },
        { id: "usage", label: "How We Use Data" },
        { id: "cookies", label: "Cookies Policy" },
        { id: "sharing", label: "Sharing of Information" },
        { id: "links-security", label: "Security & External Links" },
        { id: "opt-out-consent", label: "Choice & Consent" },
        { id: "grievance", label: "Grievance Officer" },
        { id: "disclaimers", label: "Disclaimers & Jurisdiction" },
    ];

    // Automatic ScrollSpy: Detect which section is in view during page scroll
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const offset = 150; // Comfortable offset below sticky header

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
                        <span className="text-[#d72828] font-semibold">Privacy Policy</span>
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
                                    <FiShield size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-[#111827] leading-tight">Privacy Policy</h2>
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

                            {/* Need Help Box */}
                            <div className="mt-5 pt-4 border-t border-gray-100 bg-gradient-to-br from-[#FFF5F5] to-red-50/30 rounded-xl p-3.5 text-center border border-red-100/70">
                                <div className="w-8 h-8 rounded-full bg-red-100 text-[#d72828] flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                                    <FiMail size={15} />
                                </div>
                                <h4 className="text-xs font-bold text-[#111827]">Privacy Inquiries</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5 mb-2.5">Have questions regarding your personal data?</p>
                                <a 
                                    href="mailto:info@sathyaindia.com" 
                                    className="inline-flex items-center justify-center gap-1.5 w-full bg-[#d72828] hover:bg-[#b81d1d] text-white text-xs font-bold py-2 rounded-lg transition shadow-xs"
                                >
                                    info@sathyaindia.com
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
                                Sathya Customer Privacy Protection
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111827] tracking-tight leading-tight mb-2">
                                Privacy Policy & Data Protection
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                                We value the trust you place in Sathya Agencies Limited. We insist upon the highest standards for secure transactions and user information privacy.
                            </p>
                        </div>

                        {/* 1. Overview & Commitment */}
                        <section id="intro" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiLock size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Privacy Commitment</h2>
                            </div>
                            <div className="space-y-3.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    We value the trust you place in us. That&apos;s why we insist upon the highest standards for secure transactions and customer information privacy.
                                </p>
                                <p>
                                    By visiting this website you agree to be bound by the terms and conditions of this Privacy Policy. If you do not agree please do not use or access our site.
                                </p>
                                <p>
                                    By mere use of the website, you expressly consent to our use and disclosure of your personal information in accordance with this Privacy Policy. This Privacy Policy is incorporated into and subject to the terms of the User Agreement.
                                </p>
                            </div>
                        </section>

                        {/* 2. Collection of Information */}
                        <section id="collection" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiDatabase size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Collection of Personally Identifiable Information & Other Information</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    When you use our website, we collect and store your personal information from you. Our primary goal in doing so is to provide a safe, efficient, smooth and customized experience. This allows us to provide services and features that most likely meet your needs, and to customize our Site to make your experience safer and easier. Importantly, we only collect personal information about you that we consider necessary for achieving this purpose.
                                </p>
                                <p>
                                    In general, you can browse the website without telling us who you are or revealing any personal information about yourself. Once you give us your personal information, you are not anonymous to us. Where possible, we indicate which fields are required and which fields are optional. You always have the option to not provide information by choosing not to use a particular service or feature on the website. You may provide us with a user ID.
                                </p>
                                <p>
                                    We may automatically track certain information about you based upon your behavior on our site. We use this information to do internal research on our users&apos; demographics, interests, and behavior to better understand, protect and serve our users. This information is compiled and analyzed on an aggregated basis. This information may include the URL that you just came from (whether this URL is on our site or not), which URL you next go to (whether this URL is on our site or not), your computer browser information, and your IP address.
                                </p>
                                <p>
                                    If you choose to buy on the website, we collect information about your buying behavior. If you transact with us, we collect some additional information, such as a billing address, a credit / debit card number and a credit / debit card expiration date and/ or other payment instrument details and tracking information.
                                </p>
                                <p>
                                    If you choose to post messages on our Reviews or leave feedback, we will collect that information you provide to us. We retain this information as necessary to resolve disputes, provide customer support and troubleshoot problems as permitted by law. If you send us personal correspondence, such as emails or letters, or if other users or third parties send us correspondence about your activities or postings on the Site, we may collect such information into a file specific to you.
                                </p>
                                <p>
                                    We collect personally identifiable information (email address, name, phone number, credit card / debit card / other payment instrument details etc.) from you when you set up a free account with us. While you can browse some sections of our site without being a registered member, certain activities (such as placing an order) do require registration. We do use your contact information to send you offers based on your previous orders and your interests.
                                </p>
                            </div>
                        </section>

                        {/* 3. Use of Demographic / Profile Data / Your Information */}
                        <section id="usage" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiFileText size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Use of Demographic / Profile Data / Your Information</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    We use personal information to provide the services you request. To the extent we use your personal information to market to you, we will provide you the ability to opt-out of such uses. We use your personal information to resolve disputes; troubleshoot problems; help promote a safe service; collect money; measure consumer interest in our products and services, inform you about online and offline offers, products, services, and updates; customize your experience; detect and protect us against error, fraud and other criminal activity; enforce our terms and conditions; and as otherwise described to you at the time of collection.
                                </p>
                                <p>
                                    In our efforts to continually improve our product and service offerings, we collect and analyze demographic and profile data about our users&apos; activity on our website. We identify and use your IP address to help diagnose problems with our server, and to administer our website. Your IP address is also used to help identify you and to gather broad demographic information. We will occasionally ask you to complete optional online surveys. These surveys may ask you for contact information and demographic. We use this data to tailor your experience at our site, providing you with content that we think you might be interested in and to display content according to your preferences.
                                </p>
                            </div>
                        </section>

                        {/* 4. Cookies Policy */}
                        <section id="cookies" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <BiCookie size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Cookies Policy</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    A &ldquo;cookie&rdquo; is a small piece of information stored by a Web server on a Web browser so it can be later read back from that browser. Cookies are useful for enabling the browser to remember information specific to a given user. We place both permanent and temporary cookies in your computer&apos;s hard drive. The cookies do not contain any of your personally identifiable information.
                                </p>
                                <p>
                                    We use data collection devices such as &ldquo;cookies&rdquo; on certain pages of the website to help analyze our web page flow, measure promotional effectiveness, and promote trust and safety. &ldquo;Cookies&rdquo; are small files placed on your hard drive that assist us in providing our services. We offer certain features that are only available through the use of a &ldquo;cookie&rdquo;.
                                </p>
                                <p>
                                    We also use cookies to allow you to enter your password less frequently during a session. Cookies can also help us provide information that is targeted to your interests. Most cookies are &ldquo;session cookies,&rdquo; meaning that they are automatically deleted from your hard drive at the end of a session.
                                </p>
                                <p>
                                    You are always free to decline our cookies if your browser permits, although in that case you may not be able to use certain features on the website and you may be required to reenter your password more frequently during a session. Additionally, you may encounter &ldquo;cookies&rdquo; or other similar devices on certain pages of the website that are placed by third parties. We do not control the use of cookies by third parties.
                                </p>
                            </div>
                        </section>

                        {/* 5. Sharing of Personal Information */}
                        <section id="sharing" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiShare2 size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Sharing of Personal Information</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    We may share personal information with our other corporate entities and affiliates to: help detect and prevent identity theft, fraud and other potentially illegal acts; correlate related or multiple accounts to prevent abuse of our services; and to facilitate joint or co-branded services that you request where such services are provided by more than one corporate entity. Those entities and affiliates may not market to you as a result of such sharing unless you explicitly opt in.
                                </p>
                                <p>
                                    We may disclose personal information if required to do so by law or in the good faith belief that such disclosure is reasonably necessary to respond to subpoenas, court orders, or other legal process. We may disclose personal information to law enforcement offices, third party rights owners, or others in the good faith belief that such disclosure is reasonably necessary to: enforce our Terms or Privacy Policy; respond to claims that an advertisement, posting or other content violates the rights of a third party; or protect the rights, property or personal safety of our users or the general public.
                                </p>
                            </div>
                        </section>

                        {/* 6. Security & Links to Other Sites */}
                        <section id="links-security" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <RiSecurePaymentLine size={22} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Security Precautions & Links to Other Sites</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <div>
                                    <h3 className="font-bold text-[#111827] text-base mb-1.5 flex items-center gap-2">
                                        <FiShield className="text-[#d72828]" /> Security Precautions
                                    </h3>
                                    <p>
                                        Our site has stringent security measures in place to protect the loss, misuse, and alteration of the information under our control. Whenever you change or access your account information, we offer the use of a secure server. Once your information is in our possession we adhere to strict security guidelines, protecting it against unauthorized access.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-gray-100">
                                    <h3 className="font-bold text-[#111827] text-base mb-1.5 flex items-center gap-2">
                                        <FiExternalLink className="text-[#d72828]" /> Links to Other Sites
                                    </h3>
                                    <p>
                                        Our site links to other websites that may collect personally identifiable information about you. <strong>sathya.store</strong> is not responsible for the privacy practices or the content of those linked websites.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 7. Choice / Opt-Out & Consent */}
                        <section id="opt-out-consent" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiEyeOff size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Choice / Opt-Out & Your Consent</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <div>
                                    <h3 className="font-bold text-[#111827] text-base mb-1.5">Choice / Opt-Out</h3>
                                    <p>
                                        We provide all users with the opportunity of receiving non-essential (promotional, marketing-related) communications from us, after setting up an account. If you want to remove your contact information from <strong>sathya.store</strong> kindly send a mail to <a href="mailto:info@sathyaindia.com" className="text-[#d72828] font-semibold hover:underline">info@sathyaindia.com</a>.
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-gray-100">
                                    <h3 className="font-bold text-[#111827] text-base mb-1.5">Your Consent</h3>
                                    <p>
                                        By using the Website and/ or by providing your information, you consent to the collection and use of the information you disclose on the website in accordance with this Privacy Policy, including but not limited to your consent for sharing your information as per this privacy policy.
                                    </p>
                                    <p className="mt-2">
                                        If we decide to change our privacy policy, we will post those changes on this page so that you are always aware of what information we collect, how we use it, and under what circumstances we disclose it.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 8. Grievance Officer - Dedicated High-Profile Card */}
                        <section id="grievance" className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-[#FFF5F5] via-[#FFF9F9] to-[#FFF0F0] p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-[#d72828] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                                    <FiUser size={24} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#d72828]">Redressal Mechanism</span>
                                    <h2 className="text-xl sm:text-2xl font-black text-[#111827]">Grievance Officer</h2>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 leading-relaxed mb-6">
                                For any grievance or concern regarding the processing of information or our privacy policy, please contact our designated Grievance Officer:
                            </p>

                            <div className="bg-white rounded-xl border border-red-100 p-5 sm:p-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
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
                                            <p className="text-xs text-gray-500 font-medium">Email</p>
                                            <a href="mailto:info@sathyaindia.com" className="text-sm font-bold text-[#d72828] hover:underline">
                                                info@sathyaindia.com
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

                                <div className="space-y-3 sm:border-l sm:border-gray-100 sm:pl-4">
                                    <div className="flex items-start gap-3">
                                        <FiMapPin className="text-[#d72828] mt-1 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Address</p>
                                            <p className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                                                2/86, Palaymkottai Main Road, NH7A, Maravanmadam, Tuticorin – 628101
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FiClock className="text-[#d72828] mt-1 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Working Hours</p>
                                            <p className="text-xs sm:text-sm font-semibold text-gray-800">
                                                9:00 AM – 6:00 PM (Mon – Sat, IST)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                                <FiAlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    <strong>Note:</strong> Our privacy policy is subject to change at any time without notice. To make sure you are aware of any changes, please review this policy periodically. By visiting this website you agree to be bound by the terms and conditions of this Privacy Policy. If you do not agree please do not use or access our Site.
                                </p>
                            </div>
                        </section>

                        {/* 9. Disclaimers & Jurisdiction */}
                        <section id="disclaimers" className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm scroll-mt-28">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
                                    <FiAward size={20} />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Disclaimers & Jurisdiction</h2>
                            </div>
                            <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                                <p>
                                    This site is created and controlled by <strong>Sathya Agencies Limited.</strong> The laws of India shall apply and courts in Tuticorin shall have jurisdiction in respect of all the terms, conditions and disclaimers. Sathya Agencies Limited., reserves the right to make changes to the website and the terms, conditions and disclaimers at any time and without any prior information provided to the customers/users of the services/website of Sathya Agencies Limited.
                                </p>
                                <p>
                                    This Agreement shall be governed by and interpreted and construed in accordance with the laws of India. The place of jurisdiction shall be in <strong>Tuticorin, Tamil Nadu</strong>.
                                </p>
                                
                                {/* Genuine Products Guarantee Banner */}
                                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                                    <FiCheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-900">100% Genuine & Brand New Products Guarantee</h4>
                                        <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                                            All products sold on <strong className="underline">www.sathya.store</strong> are brand new and 100% genuine. We are the authorized dealers of all companies and products displayed on our site.
                                        </p>
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

export default PrivacyPolicy;