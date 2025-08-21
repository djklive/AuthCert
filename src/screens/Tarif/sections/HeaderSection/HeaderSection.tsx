import React from "react";
import { Button } from "../../../../components/ui/button";

const navigationItems = [
  { label: "Accueil", active: false },
  { label: "A Propos", active: false },
  { label: "Tarif", active: true },
];

export const HeaderSection = (): JSX.Element => {
  return (
    <header className="w-full bg-transparent px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between py-3 sm:py-4 max-w-[1218px] mx-auto">
        <div className="flex-shrink-0">
          <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm sm:text-base tracking-[3.00px] leading-[30px] whitespace-nowrap">
            <span className="text-rose-500 tracking-[0.48px]">/</span>
            <span className="text-zinc-900 tracking-[0.48px]">AUTHCERT</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 lg:gap-[90px]">
          {navigationItems.map((item, index) => (
            <div
              key={index}
              className={`[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-sm lg:text-base tracking-[0] leading-6 whitespace-nowrap cursor-pointer ${
                item.active ? "text-rose-500" : "text-gray-900"
              }`}
            >
              {item.label}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:block [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-gray-900 text-sm lg:text-base tracking-[0] leading-6 whitespace-nowrap cursor-pointer">
            Se connecter
          </div>

          <Button
            variant="outline"
            className="h-[40px] sm:h-[45px] w-[120px] sm:w-[162px] rounded-[10px] border-[1.5px] border-zinc-400 bg-transparent hover:bg-transparent"
          >
            <div className="font-PJ-semi-bold-16px font-[number:var(--PJ-semi-bold-16px-font-weight)] text-rose-500 text-sm sm:text-[length:var(--PJ-semi-bold-16px-font-size)] tracking-[var(--PJ-semi-bold-16px-letter-spacing)] leading-[var(--PJ-semi-bold-16px-line-height)] [font-style:var(--PJ-semi-bold-16px-font-style)]">
              Inscrivez-vous
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};
