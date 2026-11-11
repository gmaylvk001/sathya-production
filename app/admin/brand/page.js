"use client";
import { useState, useEffect } from "react";

import BrandComponent from "../../../app/admin/components/brand/brand";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <BrandComponent /> {/* Use the category component here */}
    </div>
  );
}
