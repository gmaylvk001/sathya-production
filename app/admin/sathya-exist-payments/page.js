"use client";
import { useState, useEffect } from "react";
import ExistSathyaPaymentsComponent from "../../../app/admin/components/exist_sathya_payments/exist_sathya_payments";

export default function ExistSathyaPaymentsPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaPaymentsComponent />
    </div>
  );
}
