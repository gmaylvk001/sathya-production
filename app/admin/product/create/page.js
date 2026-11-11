"use client";
import { Suspense } from "react";
import ProductComponent from "@/app/admin/components/product/create";

function CreateProductForm() {
  return (
    <div className="px-2">
      <ProductComponent />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-6">Loading product form…</div>}>
      <CreateProductForm />
    </Suspense>
  );
}
