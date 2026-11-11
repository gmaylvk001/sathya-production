"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [time, setTime] = useState(null);

useEffect(() => {
  setTime(Date.now());
}, []);
  return (
    <div>
      
    </div>
  );
}
