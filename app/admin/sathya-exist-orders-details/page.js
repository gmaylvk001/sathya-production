"use client";
import { useState, useEffect } from "react";
import ExistSathyaOrderDetailsComponent from "../../../app/admin/components/exist_sathya_order_details/exist_sathya_order_details";

export default function ExistSathyaOrderDetailsPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaOrderDetailsComponent />
    </div>
  );
}
