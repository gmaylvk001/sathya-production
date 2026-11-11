"use client";
import FestivalEffects from "@/components/festival-effects/FestivalEffects";
import IndexComponent from "../components/index";

export default function Home() {
  return (
    <div className="relative">
      <FestivalEffects />
      <IndexComponent />
    </div>
  );
}
