// hooks/useDailyData.js
"use client";
import { useEffect, useState } from "react";

export default function useDailyData({ key, url, parser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(parsed);
        setLoading(false);
        return;
      } catch (err) {
        console.error("Failed to parse cached data", err);
      }
    }

    // If no cache → fetch from API
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(url);
        const json = await res.json();
        const parsed = parser ? parser(json) : json;

        setData(parsed);
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, url, parser]);

  const refresh = () => {
    localStorage.removeItem(key);
    window.location.reload();
  };

  return { data, loading, error, refresh };
}
