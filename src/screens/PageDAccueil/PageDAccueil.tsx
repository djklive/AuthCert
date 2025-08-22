"use client"
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
import { ContainerScroll } from "../../components/container-scroll-animation";

export const PageDAccueil = () => {
  return (
    <div className="flex flex-col items-center gap-12 md:gap-20 lg:gap-[100px] pt-5 pb-0 px-4 md:px-8 lg:px-0 relative bg-[#ffffff] overflow-hidden">
      <Header activePage="Accueil" />

      <MainContentSection />

      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black dark:text-white">
              Decouvrer notre nouvelle application <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                d'authentification
              </span>
            </h1>
          </>
        }
      >
        <img
          src={`/Right Illustration.png`}
          alt="Right Illustration"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
      
      {/* Image Right Illustration */}
      {/* <div className="w-full max-w-6xl mx-auto px-4">
        <img 
          src="/Right Illustration.png" 
          alt="Right Illustration" 
          className="w-full h-auto object-contain"
        />
      </div> */}
      
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
