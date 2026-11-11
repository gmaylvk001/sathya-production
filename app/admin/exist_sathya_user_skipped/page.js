"use client";
import { useState, useEffect } from "react";
import ExistSathyaUserSkippedComponent from "../../../app/admin/components/exist_sathya_user_skipped/exist_sathya_user_skipped";

export default function ExistSathyaUserSkippedPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaUserSkippedComponent />
    </div>
  );
}
