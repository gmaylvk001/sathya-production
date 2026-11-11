"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ExchangeOfferForm from "../../../components/exchange-offers-condition/ExchangeOfferForm";
import { Icon } from "@iconify/react";

export default function EditExchangeOfferPage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await fetch("/api/exchange-offers-condition");
        const data = await response.json();
        if (response.ok && data.success) {
          const offer = data.data.find((item) => item._id === id);
          if (offer) {
            setInitialData(offer);
          } else {
            setError("Offer not found.");
          }
        } else {
          setError("Failed to fetch offer data.");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching the offer.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchOffer();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto mt-5 flex justify-center p-10">
        <Icon icon="eos-icons:loading" className="text-4xl text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto mt-5 p-4 bg-red-50 text-red-600 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5">
      <ExchangeOfferForm isEdit={true} initialData={initialData} />
    </div>
  );
}
