"use client";

import React, { useEffect } from "react";

export default function ProductSkeleton() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-white w-full py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
    </div>
  );
}
