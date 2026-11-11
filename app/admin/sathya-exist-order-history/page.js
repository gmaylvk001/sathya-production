"use client";
import { useState, useEffect } from "react";
import ExistSathyaOrderHistoryComponent from "../../../app/admin/components/exist_sathya_order_history/exist_sathya_order_history";

export default function ExistSathyaOrderHistoryPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaOrderHistoryComponent />
    </div>
  );
}
