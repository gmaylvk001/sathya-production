"use client";

import { useState, useEffect,use } from "react";
import BrandComponent from "@/components/category/brand/BrandComponent";

// Next.js automatically passes params to page.js
export default function Dashboard({ params }) {
const resolvedParams = use(params);
// alert(categoryslug, brandslug);

    const [time, setTime] = useState(null);
  
    useEffect(() => {
      setTime(Date.now());
    }, []);

  return (
    <div>
      <BrandComponent 
        categorySlug={resolvedParams.categoryslug} 
        brandSlug={resolvedParams.brandslug} 
      />
    </div>
  );
}
