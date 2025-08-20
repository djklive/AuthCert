//import React from "react";
import { Separator } from "../../../../components/ui/1.separator";

const navigationLinks = [
  { label: "Accueil", href: "#" },
  { label: "A Propos", href: "#" },
  { label: "Tarif", href: "#" },
];

export const SiteFooterSection = () => {
  return (
    <footer className="w-full bg-transparent">
      <div className="w-full bg-[#f9f9f9] px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0 mb-8 lg:mb-16">
            <div className="flex items-center order-1 lg:order-1">
              <div className="relative w-9 h-[33px] mr-4 lg:mr-6">
                <div className="absolute w-8 h-8 top-0 left-0 bg-rose-500 rounded-[5px]" />
                <div className="absolute top-0 left-[3px] font-black text-[#faf7f7] text-xl [font-family:'Inter',Helvetica] tracking-[0] leading-[normal] whitespace-nowrap">
                  A
                </div>
                <div className="absolute top-[9px] left-3.5 text-xl font-black text-[#fffcfc] [font-family:'Inter',Helvetica] tracking-[0] leading-[normal] whitespace-nowrap">
                  C
                </div>
              </div>
              <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-base tracking-[3.00px] leading-[30px] whitespace-nowrap">
                <span className="text-rose-500 tracking-[0.48px]">/</span>
                <span className="text-zinc-900 tracking-[0.48px]">
                  AUTHCERT
                </span>
              </div>
            </div>

            <nav className="flex items-center space-x-8 lg:space-x-16 order-2 lg:order-2">
              {navigationLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-sm lg:text-base font-medium text-black leading-5 lg:leading-6 hover:text-rose-500 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center order-3 lg:order-3">
              <img className="w-[148px] h-7" alt="Social" src="/social.png" />
            </div>
          </div>

          <Separator className="mb-6 lg:mb-10" />

          <div className="text-center">
            <p className="text-xs lg:text-sm font-normal text-black leading-4 lg:leading-5">
              © Copyright 2025, All Rights Reserved by AuthCert
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
