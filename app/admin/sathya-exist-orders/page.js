"use client";
import { useState, useEffect } from "react";
import ExistSathyaOrdersComponent from "../../../app/admin/components/exist_sathya_orders/exist_sathya_orders";

export default function ExistSathyaOrdersPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaOrdersComponent />
    </div>
  );
}
