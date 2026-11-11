"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaVideo,
  FaComments,
  FaShoppingCart,
  FaCalendarAlt,
  FaHeadset,
  FaPhoneAlt,
  FaShieldAlt,
  FaArrowRight,
} from "react-icons/fa";
import { useModal } from "@/context/ModalContext";

const PHONE_DISPLAY = "98423 44323";
const PHONE_TEL = "9842344323";

const STEPS = [
  {
    n: 1,
    title: "Schedule a Call",
    desc: "Choose a convenient date & time.",
    icon: FaCalendarAlt,
    color: "bg-red-100 text-[#d72828]",
  },
  {
    n: 2,
    title: "Connect with Expert",
    desc: "Join the video call with our product expert.",
    icon: FaVideo,
    color: "bg-green-100 text-green-700",
  },
  {
    n: 3,
    title: "Explore & Ask",
    desc: "See the product live and get all your answers.",
    icon: FaComments,
    color: "bg-violet-100 text-violet-700",
  },
  {
    n: 4,
    title: "Buy with Confidence",
    desc: "Make the right choice with expert guidance.",
    icon: FaShoppingCart,
    color: "bg-orange-100 text-orange-600",
  },
];

const FEATURES = [
  { icon: FaVideo, text: "See the product live in-store" },
  { icon: FaComments, text: "Ask questions & get expert answers" },
  { icon: FaShoppingCart, text: "Make confident buying decisions" },
];

export default function LiveVideoDemoPage() {
  const { openLiveDemoModal } = useModal();

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10  sm:pt-8 pb-20 sm:pb-14">
        <nav className="text-[12px] sm:text-[13px] text-gray-500 mb-5 sm:mb-8 flex flex-wrap items-center gap-1">
          <Link href="/" className="hover:text-[#d72828]">
            Home
          </Link>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600">Live Demo</span>
          <span className="text-gray-400">›</span>
          <span className="text-[#041b4d] font-medium">Video Call with Expert</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left — content */}
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center rounded-full bg-[#e8eefc] text-[#1a4db8] text-[11px] sm:text-xs font-bold tracking-wide px-3 py-1 mb-4">
              Sathya Stores LIVE DEMO
            </span>

            <h1 className="text-[#041b4d] font-extrabold text-[1.65rem] sm:text-3xl lg:text-[2.15rem] leading-tight mb-3 sm:mb-4">
              See It. Ask It. Buy It.
              <br className="hidden sm:block" /> All from the comfort of your
              home.
            </h1>

            <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-5 sm:mb-6 max-w-xl">
              Connect with our product experts from your nearest Sathya Stores store
              through a live video call.
            </p>

            <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5 mb-6 sm:mb-8">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 text-[13px] text-gray-700"
                >
                  <span className="w-8 h-8 rounded-full bg-[#eef2ff] text-[#1a4db8] flex items-center justify-center flex-shrink-0">
                    <Icon className="text-[13px]" />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={openLiveDemoModal}
              className="inline-flex items-center justify-center gap-2 bg-[#1a4db8] hover:bg-[#153d96] text-white font-bold text-sm sm:text-[15px] px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg transition-colors w-full sm:w-auto"
            >
              Book a Live Video Demo
              <FaArrowRight className="text-xs" />
            </button>

            <p className="mt-3 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-emerald-600 font-medium">
              <FaShieldAlt className="text-[12px]" />
              100% Free • No obligation to buy
            </p>
          </div>

          {/* Right — image */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[450px] aspect-square rounded-2xl overflow-hidden shadow-[0_12px_40px_-12px_rgba(4,27,77,0.28)]">
              <Image
                src="/uploads/live-demo.png"
                alt="Sathya Stores Live Video Call with product expert"
                width={450}
                height={450}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full bg-[#fafbfd] border-t border-gray-100 py-10 sm:py-14">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-center gap-3 sm:gap-5 mb-8 sm:mb-10">
            <span className="hidden sm:block h-px w-16 bg-gray-300" />
            <h2 className="text-[#041b4d] font-bold text-xl sm:text-2xl text-center">
              How it works?
            </h2>
            <span className="hidden sm:block h-px w-16 bg-gray-300" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative">
            {STEPS.map(({ n, title, desc, icon: Icon, color }, i) => (
              <div
                key={title}
                className="relative bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] text-center sm:text-left"
              >
                {i < STEPS.length - 1 && (
                  <span
                    className="hidden lg:block absolute top-10 left-[calc(100%+2px)] w-[calc(100%-8px)] border-t border-dashed border-gray-300 z-0 pointer-events-none"
                    aria-hidden
                  />
                )}
                <div
                  className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mx-auto sm:mx-0 mb-3`}
                >
                  <Icon className="text-lg" />
                </div>
                <h3 className="text-[#041b4d] font-bold text-[15px] mb-1.5">
                  {n}. {title}
                </h3>
                <p className="text-gray-500 text-[13px] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help bar */}
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 rounded-2xl bg-[#eaf0fb] px-5 sm:px-7 py-5 sm:py-6">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-white text-[#1a4db8] flex items-center justify-center flex-shrink-0 shadow-sm">
              <FaHeadset className="text-lg" />
            </span>
            <p className="text-[#041b4d] text-sm sm:text-[15px] leading-snug">
              <span className="font-bold">Need help choosing the right product?</span>{" "}
              <span className="text-gray-600 font-normal">
                Our experts are here to help you.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 border border-white rounded-xl px-4 py-3 text-[#041b4d] no-underline shadow-sm transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-[#1a4db8] text-white flex items-center justify-center flex-shrink-0">
                <FaPhoneAlt className="text-sm" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] text-gray-500 font-medium leading-none mb-0.5">
                  Call Expert
                </span>
                <span className="block text-sm font-bold">{PHONE_DISPLAY}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
