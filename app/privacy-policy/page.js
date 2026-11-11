"use client";
import { useState, useEffect } from "react";

import PrivacyComponent from "@/components/privacy-policy/privacy";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>

      <PrivacyComponent />
    </div>
  );
}
