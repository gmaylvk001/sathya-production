"use client";
import { useState, useEffect } from "react";

import BulkOrdersAndGiftCardEnquiry from "@/components/bulk-orders-and-gift-card-enquiry/bulk-orders-and-gift-card-enquiry";

export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <BulkOrdersAndGiftCardEnquiry /> {/* Use the Home component here */}
    </div>
  );
}
