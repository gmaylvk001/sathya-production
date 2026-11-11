"use client";
import { useState, useEffect } from "react";
import ExistSathyaUserDetailsComponent from "../../../app/admin/components/exist_sathya_user_details/exist_sathya_user_details";

export default function ExistSathyaUserDetailsPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ExistSathyaUserDetailsComponent />
    </div>
  );
}
