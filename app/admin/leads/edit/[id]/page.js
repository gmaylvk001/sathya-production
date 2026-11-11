"use client";

import { useParams } from "next/navigation";
import LeadEditForm from "@/app/admin/components/leads/LeadEditForm";

export default function EditLeadPage() {
  const params = useParams();
  const leadId = params?.id ? String(params.id) : "";

  return <LeadEditForm leadId={leadId} />;
}
