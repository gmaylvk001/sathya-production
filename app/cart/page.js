"use client";
import { useState, useEffect } from "react";

import CartComponent from "@/components/cart";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <CartComponent /> 
    </div>
  );
}
