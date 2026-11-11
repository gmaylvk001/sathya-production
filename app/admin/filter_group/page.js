"use client";
import { useState, useEffect } from "react";

import FiltergroupComponent from "../../../app/admin/components/filter_group/filter_group";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <FiltergroupComponent /> {/* Use the category component here */}
    </div>
  );
}
