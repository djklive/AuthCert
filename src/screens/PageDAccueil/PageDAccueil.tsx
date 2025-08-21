//import * as React from "react";
import { Header } from "../../components/Header";
import { DashboardFrameSection } from "./sections/DashboardFrameSection/DashboardFrameSection";
import { DashboardWrapperSection } from "./sections/DashboardWrapperSection/DashboardWrapperSection";
import { FeaturesOverviewSection } from "./sections/FeaturesOverviewSection/FeaturesOverviewSection";
import { MainContentSection } from "./sections/MainContentSection/MainContentSection";
import { PerformanceMetricsSection } from "./sections/PerformanceMetricsSection/PerformanceMetricsSection";
import { SignUpSection } from "./sections/SignUpSection/SignUpSection";
import { SiteFooterSection } from "./sections/SiteFooterSection/SiteFooterSection";
import { TestimonialSection } from "./sections/TestimonialSection/TestimonialSection";

export const PageDAccueil = () => {
  return (
    <div className="flex flex-col items-center gap-12 md:gap-20 lg:gap-[100px] pt-5 pb-0 px-4 md:px-8 lg:px-0 relative bg-[#ffffff] overflow-hidden">
      <Header activePage="Accueil" />

      <MainContentSection />
      
      {/* Image Right Illustration */}
      <div className="w-full max-w-6xl mx-auto px-4">
        <img 
          src="/Right Illustration.png" 
          alt="Right Illustration" 
          className="w-full h-auto object-contain"
        />
      </div>
      
      <DashboardFrameSection />
      <DashboardWrapperSection />
      <FeaturesOverviewSection />
      <TestimonialSection />
      <PerformanceMetricsSection />
      <SignUpSection />
      <SiteFooterSection />
    </div>
  );
};
