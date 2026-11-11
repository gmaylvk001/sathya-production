"use client";
import { useState, useEffect } from "react";

import StoreComponent from "../../../app/admin/components/store/store";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <StoreComponent /> {/* Use the category component here */}
    </div>
  );
}
