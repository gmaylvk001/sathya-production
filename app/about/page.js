"use client";
import { useState, useEffect } from "react";

import AboutusComponent from "@/components/about/about";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>

      <AboutusComponent /> {/* Use the Home component here */}
    </div>
  );
}
