"use client";

import React from "react";
import ExchangeOfferForm from "../../components/exchange-offers-condition/ExchangeOfferForm";

export default function CreateExchangeOfferPage() {
  return (
    <div className="container mx-auto mt-5">
      <ExchangeOfferForm isEdit={false} />
    </div>
  );
}
