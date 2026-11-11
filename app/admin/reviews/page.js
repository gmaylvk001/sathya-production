"use client";

import { useState, useEffect } from "react";
import ReviewComponent from "../components/reviews/reviews";

export default function Listing() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <ReviewComponent /> 
    </div>
  );
}