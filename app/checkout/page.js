"use client";
import { useState, useEffect } from "react";

import CheckoutComponent from "@/components/checkout/checkout";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <CheckoutComponent /> {/* Use the Home component here */}
    </div>
  );
}
