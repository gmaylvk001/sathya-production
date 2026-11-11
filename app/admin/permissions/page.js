"use client";
import { useState, useEffect } from "react";

import PermissionsComponent from "../../../app/admin/components/permissions/permissions";


export default function PermissionsPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <PermissionsComponent />
    </div>
  );
}
