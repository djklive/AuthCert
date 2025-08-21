//import React from "react";
import { Button } from "../../../../components/ui/1.button";
import { Link } from "react-router-dom";

export const MainContentSection = () => {
  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="relative">
          <img
            className="absolute top-8 md:top-24 right-20 md:right-60 w-[200px] h-[84px] sm:w-[280px] sm:h-[117px] lg:w-[328px] lg:h-[137px] ml-auto"
            alt="Color"
            src="/Color.png"
          />

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[52px] font-[800] text-zinc-900 text-center leading-tight lg:leading-[62px] max-w-[871px] mb-6 px-4">
            VÉRIFIEZ L&#39;AUTHENTICITÉ DE TOUT DIPLÔME<br/> EN 1 CLIC
          </h1>

          <p className="[font-family:'Inter',Helvetica] font-normal text-gray-600 text-base sm:text-lg text-center tracking-[0] leading-6 sm:leading-7 max-w-[533px] mx-auto px-4">
            Blockchain sécurisée, QR code fluides, confiance certifiée. Notre
            solution révolutionne la vérification des certificats, garantissant
            une transparence totale et une sécurité inégalée
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button className="w-[222px] h-14 bg-rose-500 hover:bg-rose-600 rounded-[10px] font-PJ-bold-18px font-[number:var(--PJ-bold-18px-font-weight)] text-[length:var(--PJ-bold-18px-font-size)] leading-[var(--PJ-bold-18px-line-height)] tracking-[var(--PJ-bold-18px-letter-spacing)] [font-style:var(--PJ-bold-18px-font-style)] text-white">
            Scanner un QR Code
          </Button>

          <Link to="/verifier-certificat">
            <Button
              variant="outline"
              className="w-[220px] h-14 rounded-[10px] border-2 border-zinc-400 hover:bg-zinc-50 font-PJ-bold-18px font-[number:var(--PJ-bold-18px-font-weight)] text-rose-500 text-[length:var(--PJ-bold-18px-font-size)] leading-[var(--PJ-bold-18px-line-height)] tracking-[var(--PJ-bold-18px-letter-spacing)] [font-style:var(--PJ-bold-18px-font-style)]"
            >
              Verifier un certificat
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 max-w-[533px] mx-auto px-4">
          <span className="font-inter-regular-16px font-[number:var(--inter-regular-16px-font-weight)] text-zinc-500 text-[length:var(--inter-regular-16px-font-size)] tracking-[var(--inter-regular-16px-letter-spacing)] leading-[var(--inter-regular-16px-line-height)] [font-style:var(--inter-regular-16px-font-style)]">
            60 Jours de période d&apos;essaie
          </span>

          <div className="flex items-center gap-2">
          <img
            className="w-6 h-6"
            alt="Arcticons trust"
            src="/arcticons_trust-wallet.svg"
          />

          <span className="font-inter-regular-16px font-[number:var(--inter-regular-16px-font-weight)] text-zinc-500 text-[length:var(--inter-regular-16px-font-size)] tracking-[var(--inter-regular-16px-letter-spacing)] leading-[var(--inter-regular-16px-line-height)] [font-style:var(--inter-regular-16px-font-style)]">
            Blockchain sécurise
          </span>
          </div>
        </div>
      </div>
    </section>
  );
};
