"use client";
import { useState, useEffect } from "react";

import CategoryComponent from "@/components/category/category";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <CategoryComponent /> {/* Use the category component here */}
    </div>
  );
}