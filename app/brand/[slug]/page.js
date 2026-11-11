"use client";
import { useState, useEffect, use } from "react"; // Import 'use' from React
import BrandComponent from "@/components/brand/BrandComponent";

export default function Dashboard({ params }) {
  // Unwrap the params promise using React.use()
  const resolvedParams = use(params);
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      {/* Pass the resolved params to the BrandComponent */}
      <BrandComponent params={resolvedParams} />
    </div>
  );
}