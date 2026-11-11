"use client";
import { useState, useEffect } from "react";

import ExistSathyaUsersComponent from "../../../app/admin/components/exist_sathya_users/exist_sathya_users";


export default function ExistSathyaUsersPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <ExistSathyaUsersComponent />
    </div>
  );
}
