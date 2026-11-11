"use client";
import { useState, useEffect } from "react";

import JobsComponent from "@/components/jobs/jobs";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <JobsComponent /> {/* Use the Home component here */}
    </div>
  );
}
