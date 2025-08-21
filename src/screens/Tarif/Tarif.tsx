//import React from "react";
import { Header } from "../../components/Header";
import { PricingSection } from "./sections/PricingSection/PricingSection";

export const Tarif = () => {
  return (
    <div className="bg-white w-full min-h-screen">
      <div className="bg-neutral-50 w-full min-h-screen flex flex-col">
        <Header activePage="Tarif" />
        <PricingSection />
      </div>
    </div>
  );
};
