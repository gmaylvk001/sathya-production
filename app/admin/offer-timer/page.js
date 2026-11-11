"use client";

import OfferTimerList from "../components/offer-timer/OfferTimerList";
import StateDealsOfferSection from "../components/offer-timer/StateDealsOfferSection";

export default function OfferTimerPage() {
  return (
    <div className="space-y-8 pb-12">
      <OfferTimerList />
      <StateDealsOfferSection />
    </div>
  );
}
