'use client';
import Image from 'next/image';
import Link from 'next/link';
import { BsFillAwardFill } from "react-icons/bs";
import { FaUserGroup } from "react-icons/fa6";
import { GiNetworkBars } from "react-icons/gi";
import { FaThumbsUp } from "react-icons/fa";
import { FiHeadphones,  FiSettings,FiTag, FiTarget, FiMapPin, FiAward, FiUsers,FiUser,  FiMonitor, FiSpeaker, FiShoppingCart, FiStar, FiHome, FiBriefcase, FiPackage, FiCreditCard, FiTrendingUp, FiGift } from 'react-icons/fi';
import { useRouter } from "next/navigation";

const AboutUs = () => {
    const router = useRouter();
    
    const chooseData = [
        {
            icon: <FiAward size={26} />,
            title: "100% Genuine Products",
            desc: "Authorized retailer for leading electronics and home appliance brands."
        },
        {
            icon: <FiShoppingCart size={26} />,
            title: "Wide Product Range",
            desc: "5000+ products including TVs, refrigerators, ACs and mobiles."
        },
        {
            icon: <FiUsers size={26} />,
            title: "Customer First Approach",
            desc: "Trusted by families for honest advice and better service."
        },
        {
            icon: <FiHome size={26} />,
            title: "427+ Store Network",
            desc: "Always near you with 427+ showrooms across South India."
        },
        {
            icon: <FiCreditCard size={26} />,
            title: "Flexible Finance Options",
            desc: "Easy EMI & finance solutions from leading banks."
        },
        {
            icon: <FiHeadphones size={26} />,
            title: "Reliable Support",
            desc: "Before & after purchase support, installation & service."
        }
    ];

    const storeExperience = [
        {
            icon: <FiMonitor size={28} />,
            title: "TV & Audio Lounge",
            desc: "Experience 4K, 8K OLED & smart Dolby sound systems live.",
            tag: "Live Audio-Visual",
            color: "text-[#d72828] bg-red-50 border-red-100"
        },
        {
            icon: <FiSettings size={28} />,
            title: "Kitchen Appliance Studio",
            desc: "Smart cooking hobs, chimneys, dishwashers & air fryers.",
            tag: "Smart Cooking",
            color: "text-rose-600 bg-rose-50 border-rose-100"
        },
        {
            icon: <FiHome size={28} />,
            title: "Refrigerator Zone",
            desc: "Side-by-side, French door & multi-door inverter cooling.",
            tag: "Energy Efficient",
            color: "text-emerald-600 bg-emerald-50 border-emerald-100"
        },
        {
            icon: <FiHeadphones size={28} />,
            title: "AC Comfort Zone",
            desc: "Inverter ACs, split systems & smart climate controls.",
            tag: "All-Season Cooling",
            color: "text-[#d72828] bg-red-50 border-red-100"
        },
        {
            icon: <FiUsers size={28} />,
            title: "Customer Interaction Hub",
            desc: "One-on-one personalized consultation with product experts.",
            tag: "Honest Guidance",
            color: "text-amber-600 bg-amber-50 border-amber-100"
        },
        {
            icon: <FiPackage size={28} />,
            title: "Fast & Safe Delivery",
            desc: "Safe unboxing, expert demo & prompt installation at doorstep.",
            tag: "Doorstep Service",
            color: "text-[#d72828] bg-red-50 border-red-100"
        },
    ];

    const brands = [
        "/uploads/Brands/brand_1778758654308.png",
        "/uploads/Brands/brand_1778764524439.png",
        "/uploads/Brands/brand_1778994553980.png",
        "/uploads/Brands/brand_1778996291806.png",
        "/uploads/Brands/brand_1779078793650.png",
        "/uploads/Brands/panasonic.jpg",
        "/uploads/Brands/brand_1778764090037.png",
        "/uploads/Brands/brand-1754720247059.webp",
        "/uploads/Brands/VIw4LetLiEoOuqOk.webp",
        "/uploads/Brands/brand-1754545986132.webp",
    ];

    return (
        <>
            {/* 🟠 About us Header Bar */}
            <div className="bg-red-50 py-5 px-4 md:px-8 lg:px-10 flex justify-between items-center border-b border-red-100">
                <div className="flex items-center space-x-2 text-sm">
                    <Link href="/" className="text-gray-600 hover:text-[#d72828] transition">🏠 Home</Link>
                    <span className="text-gray-400">›</span>
                    <span className="text-[#d72828] font-semibold">About us</span>
                </div>
            </div>

            {/* 🖼️ Hero Background Banner Section (With Background Image) */}
            <section className="w-full">
                {/* Desktop/Laptop - overlay layout */}
                <div className="relative w-full hidden lg:block">
                    <Image 
                        src="/uploads/aboutus-banner-store.png" 
                        width={1920}
                        height={650}
                        alt="Sathya Stores Showroom" 
                        className="relative z-0 w-full h-auto block object-cover"
                        priority
                        unoptimized
                    />
                    {/* Content Overlay */}
                    <div className="absolute inset-0 z-[2] flex items-center px-4 md:px-8 lg:px-10 bg-gradient-to-r from-white/95 via-white/75 to-transparent">
                        <div className="w-[50%] lg:w-[45%] xl:w-[40%] 2xl:w-[35%]">
                            <p className="text-sm xl:text-base 2xl:text-lg text-gray-500 mb-1">Tamil Nadu&apos;s</p>
                            <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-6xl font-bold leading-tight text-[#111827]">Most Trusted <br />Electronics Destination</h1>
                            <h2 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-6xl font-bold text-[#d72828] mt-2">Since 1987</h2>
                            <p className="mt-2 text-gray-600 text-sm xl:text-base 2xl:text-xl leading-7 2xl:leading-9">Sathya Agencies Limited is one of South India&apos;s largest consumer durables and electronics retailers, with 427+ stores across Tamil Nadu, Andhra Pradesh, Kerala, Karnataka and Puducherry.</p>
                            <div className="flex flex-wrap gap-3 mt-6">
                                <a
                                    href="https://sathya.adtarbo.com/stores"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#d72828] text-white px-5 py-2.5 2xl:px-7 2xl:py-3 rounded-lg font-semibold text-sm 2xl:text-base flex items-center gap-2 hover:bg-[#b81d1d] transition shadow-md"
                                >
                                    <FiMapPin size={16} />
                                    Explore Our Stores
                                </a>
                                <button onClick={() => router.push("/")} className="border-2 border-[#d72828] text-[#d72828] bg-white/80 px-5 py-2.5 2xl:px-7 2xl:py-3 rounded-lg font-semibold text-sm 2xl:text-base flex items-center gap-2 hover:bg-[#d72828] hover:text-white transition shadow-xs">
                                    <FiShoppingCart size={16} />
                                    Shop Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tablet/Mobile - stacked layout */}
                <div className="lg:hidden">
                    <Image 
                        src="/uploads/aboutus-banner-store.png" 
                        width={1920}
                        height={650}
                        alt="Sathya Stores Showroom" 
                        className="w-full h-auto block object-cover"
                        priority
                        unoptimized
                    />
                    <div className="px-4 md:px-8 py-8 bg-gradient-to-b from-[#FFF5F5] via-white to-white">
                        <p className="text-xs text-gray-500 mb-1">Tamil Nadu&apos;s</p>
                        <h1 className="text-2xl font-bold leading-tight text-[#111827]">Most Trusted <br />Electronics Destination</h1>
                        <h2 className="text-2xl font-bold text-[#d72828] mt-1">Since 1987</h2>
                        <p className="mt-2 text-gray-600 text-sm leading-relaxed">Sathya Agencies Limited is one of South India&apos;s largest consumer durables and electronics retailers, with 427+ stores across South India.</p>
                        <div className="flex flex-wrap gap-3 mt-5">
                            <a
                                href="https://sathya.adtarbo.com/stores"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#d72828] text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-[#b81d1d] transition"
                            >
                                <FiMapPin size={16} />
                                Explore Our Stores
                            </a>
                            <button onClick={() => router.push("/")} className="border border-[#d72828] text-[#d72828] px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-[#d72828] hover:text-white transition">
                                <FiShoppingCart size={16} />
                                Shop Now
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 📦 ALL SUBSEQUENT SECTIONS BUILT WITH PURE MODERN UI DESIGN (NO IMAGES) */}
            <div className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8">
               
                {/* 1. Statistics Bar (Pure UI) */}
                <section className="-mt-8 relative z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-150 p-4 sm:p-5">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-4">
                                {[
                                    { count: "25+", label: (<>Years of <br />Excellence</>), icon: <FiAward size={28} className="text-[#d72828]" /> },
                                    { count: "427+", label: (<>Showrooms <br />Across South India</>), icon: <FiHome size={28} className="text-[#d72828]" /> },
                                    { count: "17+", label: (<>Major Cities <br />We Serve</>), icon: <FiMapPin size={28} className="text-[#d72828]" /> },
                                    { count: "50 Lakh+", label: (<>Happy <br />Families</>), icon: <FiUsers size={28} className="text-[#d72828]" /> },
                                    { count: "30+", label: (<>Leading <br />Brand Partners</>), icon: <FiBriefcase size={28} className="text-[#d72828]" /> },
                                    { count: "5000+", label: (<>Products <br />Across Categories</>), icon: <FiPackage size={28} className="text-[#d72828]" /> },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-1 ${ i !== 5 ? "lg:border-r border-gray-200" : ""}`}>
                                        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 shadow-xs">{item.icon}</div>
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-black text-[#d72828] leading-none mb-1">{item.count}</h3>
                                            <p className="text-gray-600 text-[11px] sm:text-xs leading-4">{item.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* 2. Why Customers Choose Sathya Stores (Pure UI Icon Cards) */}
                <section className="py-10 bg-white">
                    <div className="w-full px-4 md:px-8 lg:px-10">
                        <div className="text-center mb-8">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#d72828] bg-red-50 px-3.5 py-1 rounded-full border border-red-100">
                                Our Key Advantages
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2">Why Customers Choose Sathya Stores?</h2>
                            <div className="w-12 h-1 bg-[#d72828] mx-auto mt-2.5 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {chooseData.map((item, i) => (
                                <div key={i} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-red-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group">
                                    <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#d72828] group-hover:bg-[#d72828] group-hover:text-white flex items-center justify-center text-2xl transition-all duration-300 shadow-xs mb-4">
                                        {item.icon}
                                    </div>
                                    <h3 className="font-bold text-[#111827] text-sm sm:text-[15px] group-hover:text-[#d72828] transition-colors min-h-[38px] flex items-center justify-center">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                {/* 3. Experience Sathya Stores - Store Experience Zones (Pure UI Cards - No Images) */}
                <section className="py-8 bg-white">
                    <div className="w-full px-4 md:px-8 lg:px-10">
                        <div className="text-center mb-8">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#d72828] bg-red-50 px-3.5 py-1 rounded-full border border-red-100">
                                In-Store Experience
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2">Experience Sathya Stores</h2>
                            <div className="w-12 h-1 bg-[#d72828] mx-auto mt-2.5 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {storeExperience.map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-white border border-gray-150 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-red-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border mb-3.5 transition-transform duration-300 group-hover:scale-110 ${item.color}`}>
                                            {item.icon}
                                        </div>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 mb-2">
                                            {item.tag}
                                        </span>
                                        <h3 className="text-sm font-bold text-[#111827] group-hover:text-[#d72828] transition-colors leading-snug mb-1.5">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] font-bold text-[#d72828] group-hover:translate-x-1 transition-transform">
                                        Explore Zone →
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 5. Company Journey Timeline & Vision */}
                <section className="py-10">
                    <div className="w-full px-4 md:px-8 lg:px-10">
                        
                        {/* Row 1: Journey & Vision */}
                        <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-5 mb-6">
                            {/* Journey */}
                            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-150 shadow-lg">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-bold text-[#111827]">Our Journey</h2>
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">1987 — 2026</span>
                                </div>
                                <div className="relative">
                                    {/* Connecting Line */}
                                    <div className="hidden md:block absolute top-7 left-[6%] right-[6%] h-[3px] bg-gradient-to-r from-[#d72828] via-rose-400 to-amber-500"></div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
                                        {[
                                            { year: "1987", title: "Our Beginning", desc: "Started in Tuticorin, Tamil Nadu.", icon: <FiHome size={20} />, color: "bg-[#d72828]" },
                                            { year: "1990", title: "Sathya Agencies", desc: "Expanded partnership firm.", icon: <FiBriefcase size={20} />, color: "bg-amber-600" },
                                            { year: "2005", title: "Incorporation", desc: "Incorporated as Limited Company.", icon: <FiTrendingUp size={20} />, color: "bg-emerald-600" },
                                            { year: "2015", title: "Growing Network", desc: "Fast retail presence across South India.", icon: <FiAward size={20} />, color: "bg-rose-600" },
                                            { year: "2020", title: "Digital Era", desc: "Omnichannel e-commerce & Live Demo.", icon: <FiMapPin size={20} />, color: "bg-[#d72828]" },
                                            { year: "2026", title: "427+ Stores", desc: "Leading South Indian retail network.", icon: <FiGift size={20} />, color: "bg-amber-600" },
                                        ].map((item, i) => (
                                            <div key={i} className="text-center">
                                                <div className={`w-12 h-12 mx-auto rounded-full ${item.color} border-4 border-white shadow-md flex items-center justify-center text-white`}>
                                                    {item.icon}
                                                </div>
                                                <h4 className="text-[#111827] font-bold text-sm mt-2.5">{item.year}</h4>
                                                <p className="text-[11px] font-semibold text-gray-800">{item.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Vision */}
                            <div className="bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#1c1917] text-white rounded-2xl shadow-lg border border-gray-800 p-6 sm:p-7 flex flex-col justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-red-300 border border-white/20 mb-3">
                                        <span>🌟</span> Corporate Mission
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">Our Vision</h3>
                                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-3">
                                        Sathya Agencies Limited brings world-class electronics and home appliances closer to every home across South India with unmatched trust and transparency.
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                        With 427+ stores and partnerships with 150+ leading brands, we combine trust, technology and exceptional customer happiness.
                                    </p>
                                </div>
                                <div className="pt-4 mt-4 border-t border-white/15 flex items-center justify-between text-xs text-gray-300">
                                    <span>Integrity • Trust • Value</span>
                                    <span className="text-[#ff7676] font-bold">Since 1987</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Tamil Nadu Stores Dashboard & Brand Partners */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 items-stretch">
                            
                            {/* Tamil Nadu Regional Presence (Pure UI Dashboard - No Image) */}
                            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-lg flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-[#111827]">Sathya Stores Regional Coverage</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">Serving 427+ locations across South India</p>
                                        </div>
                                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                                        {[
                                            "Coimbatore", "Chennai", "Madurai", "Trichy",
                                            "Salem", "Erode", "Tirupur", "Tirunelveli",
                                            "Tuticorin", "Vellore", "Dharmapuri", "Krishnagiri"
                                        ].map((city, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-150 text-xs font-semibold text-gray-700">
                                                <span className="text-[#d72828]">📍</span>
                                                <span className="truncate">{city}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Regional Breakdown Bars */}
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        {[
                                            { region: "Tamil Nadu Network", stores: "350+ Stores", width: "85%" },
                                            { region: "Karnataka & Bengaluru", stores: "35+ Stores", width: "40%" },
                                            { region: "Kerala & Andhra Pradesh", stores: "30+ Stores", width: "35%" },
                                            { region: "Puducherry & UT", stores: "12+ Stores", width: "20%" },
                                        ].map((r, idx) => (
                                            <div key={idx} className="space-y-0.5">
                                                <div className="flex justify-between text-[11px] font-semibold text-gray-700">
                                                    <span>{r.region}</span>
                                                    <span className="text-[#d72828] font-bold">{r.stores}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-[#d72828] h-full rounded-full" style={{ width: r.width }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 pt-3 border-t border-gray-100 text-center">
                                    <a
                                        href="https://sathya.adtarbo.com/stores"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-[#111827] hover:text-[#d72828] transition flex items-center justify-center gap-1 mx-auto"
                                    >
                                        View All 427+ Store Addresses & Directions →
                                    </a>
                                </div>
                            </div>

                            {/* Brand Partners */}
                            <div className="bg-white rounded-2xl border border-gray-150 shadow-lg p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-[#111827] mb-1">Our Premium Brand Partners</h3>
                                    <p className="text-gray-500 text-xs mb-5">Sathya Stores brings together the world&apos;s leading electronics and home appliance brands under one roof.</p>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                                        {brands.map((logo, i) => (
                                            <div key={i} className="h-14 bg-white border border-gray-150 rounded-xl p-2 flex items-center justify-center hover:shadow-md hover:border-red-200 transition">
                                                <img src={logo} alt="Brand Partner" className="max-h-7 max-w-[80px] object-contain"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-center mt-6 pt-3 border-t border-gray-100">
                                    <button onClick={() => router.push("/")} className="bg-[#d72828] hover:bg-[#b81d1d] text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-md shadow-red-500/10">
                                        Explore All Brand Offers →
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Team Values Banner & Testimonials */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            
                            {/* Team & People Culture Banner (Pure Modern UI - No image) */}
                            <div className="rounded-2xl shadow-lg bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#1c1917] border border-gray-800 p-6 sm:p-8 text-white flex flex-col justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-red-300 mb-4 backdrop-blur-sm">
                                        <span>✨</span> Sathya Culture & People
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                                        Built on Trust. <br className="hidden sm:inline" />Driven by Passionate People.
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-6">
                                        Meet the 3,000+ passionate team members across South India who believe in customer delight, honesty, and excellence in every interaction.
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15">
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                                        <h4 className="text-xl font-bold text-white">3,000+</h4>
                                        <p className="text-[11px] text-gray-300 mt-0.5">Trained Staff</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                                        <h4 className="text-xl font-bold text-white">427+</h4>
                                        <p className="text-[11px] text-gray-300 mt-0.5">Showrooms</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                                        <h4 className="text-xl font-bold text-white">24/7</h4>
                                        <p className="text-[11px] text-gray-300 mt-0.5">Support Care</p>
                                    </div>
                                </div>
                            </div>

                            {/* Testimonials (Pure Modern UI Avatar Cards - No image) */}
                            <div className="bg-white rounded-2xl border border-gray-150 shadow-lg p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xl font-bold text-[#111827]">What Our Customers Say</h3>
                                        <div className="text-amber-500 font-bold text-xs flex items-center gap-1">
                                            ★★★★★ <span>4.9 / 5.0</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        {[
                                            {
                                                name: "Ramesh Kumar",
                                                city: "Coimbatore",
                                                initials: "RK",
                                                review: "Best place to buy electronics. Great staff and quick installation!",
                                                color: "from-red-600 to-rose-700"
                                            },
                                            {
                                                name: "Priya Natarajan",
                                                city: "Chennai",
                                                initials: "PN",
                                                review: "Wide range of genuine products with competitive pricing.",
                                                color: "from-amber-600 to-orange-700"
                                            },
                                            {
                                                name: "Karthik Vel",
                                                city: "Madurai",
                                                initials: "KV",
                                                review: "Finance and EMI options were processed seamlessly in minutes.",
                                                color: "from-rose-600 to-red-700"
                                            },
                                        ].map((item, i) => (
                                            <div key={i} className="border border-gray-150 bg-gray-50/50 rounded-xl p-3.5 flex flex-col justify-between hover:shadow-md hover:bg-white transition">
                                                <div>
                                                    <div className="text-yellow-400 text-xs mb-2">★★★★★</div>
                                                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                                                        &ldquo;{item.review}&rdquo;
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100">
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.color} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                                                        {item.initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[#111827] text-xs truncate">{item.name}</p>
                                                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate">📍 {item.city}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-5 pt-3 border-t border-gray-100 text-center text-xs text-gray-500">
                                    Trusted by over <strong className="text-gray-800">50 Lakh+ happy families</strong> across South India.
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            </div>
        </>
    );
};

export default AboutUs;