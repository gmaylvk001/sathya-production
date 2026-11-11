"use client";
import { useState, useEffect } from "react";

import MapboxComponent from "../../../app/admin/components/mapbox/mapbox";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <MapboxComponent /> {/* Use the category component here */}
    </div>
  );
}
