"use client";
import { useState, useEffect } from "react";

import ProductComponent from "@/app/admin/components/product/product";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <ProductComponent /> {/* Use the category component here */}
    </div>
  );
}
