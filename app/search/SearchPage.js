"use client";

import { useState, useEffect } from "react";
import SearchComponent from "@/components/search/index";

export default function SearchPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <SearchComponent />
    </div>
  );
}

