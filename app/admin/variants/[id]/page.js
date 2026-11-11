"use client";

import { useParams } from "next/navigation";
import VariantGroupForm from "@/app/admin/components/variants/VariantGroupForm";

export default function EditVariantGroupPage() {
  const { id } = useParams();
  return <VariantGroupForm groupId={id} />;
}
