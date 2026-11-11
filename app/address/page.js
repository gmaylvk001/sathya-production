"use client";
import { useState, useEffect } from "react";

import AddressComponent from "@/components/address/address";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <AddressComponent /> {/* Use the ProfileComponent here */}
    </div>
  );
}
