"use client";

import { use } from "react";
import ComboOfferForm from "@/app/admin/components/combo-offers/ComboOfferForm";

export default function EditComboOfferPage({ params }) {
  const { id } = use(params);
  return <ComboOfferForm comboId={id} />;
}
