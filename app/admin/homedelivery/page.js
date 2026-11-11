"use client";
import { useState, useEffect } from "react";
import OrdersTable from "../components/homedelivery/allorder";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <OrdersTable /> 
    </div>
  );
}
