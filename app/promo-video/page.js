"use client";
import { useState, useEffect } from "react";

import PromoVideoComponent from "@/components/promo-video/promo-video";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <PromoVideoComponent /> {/* Use the Home component here */}
    </div>
  );
}
