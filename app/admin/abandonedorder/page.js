"use client";
import { useState, useEffect } from "react";
import OrdersTable from "../components/allorder/allorder";
import OrdersTable_abon from "../components/abandonedorder/abandonedorder";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <OrdersTable_abon /> 
    </div>
  );
}
