"use client";
import { useState, useEffect } from "react";

import CancelOrders from "@/app/admin/components/order/CancelOrders";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <CancelOrders /> {/* Use the order component here */}
    </div>
  );
}
