"use client";
import { useState, useEffect } from "react";

import ContactComponent from "../../../app/admin/components/contact/contact";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <ContactComponent /> {/* Use the category component here */}
    </div>
  );
}
