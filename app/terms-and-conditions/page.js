"use client";
import { useState, useEffect } from "react";

import TermsandcoditionComponent from "@/components/termsandcodition/termsandcodition";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <TermsandcoditionComponent /> 
    </div>
  );
}
