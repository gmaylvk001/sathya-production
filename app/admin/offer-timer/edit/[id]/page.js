"use client";

import { useParams } from "next/navigation";
import OfferTimerForm from "../../../components/offer-timer/OfferTimerForm";

export default function EditOfferTimerPage() {
  const params = useParams();
  return <OfferTimerForm timerId={params?.id} />;
}
