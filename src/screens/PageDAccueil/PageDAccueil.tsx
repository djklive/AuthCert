//import * as React from "react";
import { Button } from "../../components/ui/1.button";
import { DashboardFrameSection } from "./sections/DashboardFrameSection/DashboardFrameSection";
import { DashboardWrapperSection } from "./sections/DashboardWrapperSection/DashboardWrapperSection";
import { FeaturesOverviewSection } from "./sections/FeaturesOverviewSection/FeaturesOverviewSection";
import { MainContentSection } from "./sections/MainContentSection/MainContentSection";
import { PerformanceMetricsSection } from "./sections/PerformanceMetricsSection/PerformanceMetricsSection";
import { RightIllustrationSection } from "./sections/RightIllustrationSection/RightIllustrationSection";
import { SignUpSection } from "./sections/SignUpSection/SignUpSection";
import { SiteFooterSection } from "./sections/SiteFooterSection/SiteFooterSection";
import { TestimonialSection } from "./sections/TestimonialSection/TestimonialSection";
import { Link } from "react-router-dom";

export const PageDAccueil = () => {
  const navigationItems = [
    { label: "Accueil", active: true },
    { label: "A Propos", active: false },
    { label: "Tarif", active: false },
  ];

  return (
    <div className="flex flex-col items-center gap-12 md:gap-20 lg:gap-[100px] pt-5 pb-0 px-4 md:px-8 lg:px-0 relative bg-[#ffffff] overflow-hidden">
      <header className="relative w-full max-w-[1322px] h-auto md:h-[45px]  bg-transparent">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between md:justify-start w-full md:relative">
          <div className="flex items-center mb-4 md:mb-0 md:absolute md:w-[142px] md:h-[33px] md:top-[3px] md:left-0">
            <div className="relative w-[140px] h-[33px]">
              <div className="top-0.5 left-6 [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-transparent text-base tracking-[3.00px] leading-[30px] absolute whitespace-nowrap">
                <span className="text-rose-500 tracking-[0.48px]">/</span>
                <span className="text-zinc-900 tracking-[0.48px]">AUTHCERT</span>
              </div>

              <div className="absolute w-9 h-[33px] top-0 left-0">
                <div className="relative w-8 h-[33px]">
                  <div className="absolute w-8 h-8 top-0 left-0 bg-rose-500 rounded-[5px]" />
                  <div className="absolute top-[9px] left-3.5 [font-family:'Inter',Helvetica] font-black text-[#fffcfc] text-xl tracking-[0] leading-[normal] whitespace-nowrap">
                    C
                  </div>
                  <div className="absolute top-0 left-[3px] [font-family:'Inter',Helvetica] font-black text-[#faf7f7] text-xl tracking-[0] leading-[normal] whitespace-nowrap">
                    A
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="mb-4 md:mb-0 md:absolute md:w-[259px] md:h-6 md:top-[11px] md:left-[543px]">
            <div className="relative w-full md:w-[271px] h-6 flex gap-6 md:gap-[40px] justify-center md:justify-start">
              {navigationItems.map((item, index) => (
                <div
                  key={index}
                  className={`[font-family:'ABeeZee',Helvetica] font-normal text-base tracking-[0] leading-6 whitespace-nowrap cursor-pointer ${
                    item.active ? "text-rose-500" : "text-zinc-900"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </nav>

          <div className="flex flex-col sm:flex-row items-center gap-4 md:absolute md:top-[0px] md:left-[1042px]">
            <Link to="/auth">
              <div className="[font-family:'ABeeZee',Helvetica] font-normal text-zinc-900 text-base tracking-[0] leading-6 whitespace-nowrap cursor-pointer">
                Se connecter
              </div>
            </Link>

            <Button
              variant="outline"
              className="w-full sm:w-[162px] h-[45px] rounded-[10px] border-[1.5px] border-solid border-zinc-400 bg-transparent hover:bg-gray-50"
            >
              <Link to="/auth/signup">
                <span className="[font-family:'ABeeZee',Helvetica] font-normal text-rose-500 text-base text-right tracking-[0] leading-6 whitespace-nowrap cursor-pointer">
                  inscrivez vous
                </span>
              </Link>
            </Button> 
            
          </div>
        </div>
      </header>

      <MainContentSection />
      <RightIllustrationSection />
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
