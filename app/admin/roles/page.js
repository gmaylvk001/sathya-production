"use client";
import { useState, useEffect } from "react";

import RolesComponent from "../../../app/admin/components/roles/roles";


export default function RolesPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <RolesComponent />
    </div>
  );
}
