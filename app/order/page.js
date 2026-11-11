"use client";
import { useState, useEffect } from "react";

import OrderComponent from "@/components/order/order";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <OrderComponent /> {/* Use the OrderComponent here */}
    </div>
  );
}
