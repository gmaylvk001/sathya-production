"use client";
import { useState, useEffect } from "react";

import UserComponent from "../../../app/admin/components/user/user";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <UserComponent /> {/* Use the category component here */}
    </div>
  );
}
