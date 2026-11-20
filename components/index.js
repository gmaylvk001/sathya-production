"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePageRenderer from "@/components/homePageComponents/HomePageRenderer";

export default function HomeComponent() {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => setNavigating(false);
    if (!router?.events?.on) return;
    router.events.on("routeChangeComplete", handleRouteChange);
    router.events.on("routeChangeError", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
      router.events.off("routeChangeError", handleRouteChange);
    };
  }, [router]);

  return (
    <>
      {navigating && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-black bg-opacity-30">
          <div className="p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="preloader fixed inset-0 z-[9999] flex justify-center items-center bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
        </div>
      )}
      <div
        className={`relative transition-opacity duration-300 ${
          isLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
        }`}
        ref={containerRef}
      >
        <div className="home-container">
          <h1 className="sr-only">
            SATHYA Store - Best Online Shopping for Home Appliances & Electronics
          </h1>
          <HomePageRenderer />
        </div>
        <ToastContainer />
      </div>
    </>
  );
}
