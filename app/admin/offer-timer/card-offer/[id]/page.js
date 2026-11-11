"use client";

import { useParams } from "next/navigation";
import CardOffersView from "../../../components/offer-timer/CardOffersView";

export default function CardOffersPage() {
  const params = useParams();
  return <CardOffersView timerId={params?.id} />;
}
