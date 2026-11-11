"use client";
import { useState, useEffect } from "react";
import PlaceOrders from "@/app/admin/components/order/PlaceOrders";

export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <PlaceOrders />
    </div>
  );
}
