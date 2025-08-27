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
import { AnimatedSection, AnimatedTitle, AnimatedImage } from "../../components/animations/ScrollAnimation";

export const PageDAccueil = () => {
  return (
    <div className="flex flex-col items-center gap-12 md:gap-20 lg:gap-[100px] pt-5 pb-0 px-4 md:px-8 lg:px-0 relative bg-[#ffffff] overflow-hidden">
      <Header activePage="Accueil" />

      <AnimatedSection delay={0.1}>
        <MainContentSection />
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <ContainerScroll
          titleComponent={
            <AnimatedTitle delay={0.3}>
              <h1 className="text-4xl font-semibold text-black dark:text-white">
                Decouvrer notre nouvelle application <br />
                <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                  d'authentification
                </span>
              </h1>
            </AnimatedTitle>
          }
        >
          <AnimatedImage
            src="/Right Illustration.png"
            alt="Right Illustration"
            className="mx-auto rounded-2xl object-cover h-full object-left-top"
            delay={0.4}
          />
        </ContainerScroll>
      </AnimatedSection>
      
      <AnimatedSection delay={0.5}>
        <DashboardFrameSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.6}>
        <DashboardWrapperSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.7}>
        <FeaturesOverviewSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.8}>
        <TestimonialSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.9}>
        <PerformanceMetricsSection />
      </AnimatedSection>
      
      <AnimatedSection delay={1.0}>
        <SignUpSection />
      </AnimatedSection>
      
        <SiteFooterSection />
      {/* <AnimatedSection delay={1.1}>
      </AnimatedSection> */}
    </div>
  );
};
