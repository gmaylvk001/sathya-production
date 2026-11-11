"use client";
import { useState, useEffect } from "react";

import SystemUsersComponent from "../../../app/admin/components/system_users/system_users";


export default function SystemUsersPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <SystemUsersComponent />
    </div>
  );
}
