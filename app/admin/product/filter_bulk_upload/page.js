"use client";

import { useState, useEffect } from "react";
import FilterBulkUploadComponent from "@/app/admin/components/product/filter-bulk-upload";

export default function FilterBulkUploadPage() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      <FilterBulkUploadComponent />
    </div>
  );
}
