//import React from "react";

export const DashboardWrapperSection = () => {
  return (
    <section className="flex flex-col lg:flex-row items-start gap-8 lg:gap-[100px] justify-center w-full px-4 sm:px-6 lg:px-8">
      <img
        className="w-full max-w-[504px] h-auto lg:h-[456px] rounded-[10px] object-cover flex-shrink-0 mx-auto lg:mx-0"
        alt="Rectangle"
        src="/blockchain image.webp"
      />

      <div className="flex-1 max-w-[515px]">
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[58px] font-[800] text-zinc-900 leading-tight lg:leading-[66px]">
            NOTRE SOLUTION : Vérification instantanée et infalsifiable
          </h2>

          <p className="text-base lg:text-lg font-normal text-gray-600 leading-6 lg:leading-7">
            Sécurité, Rapidité et Accessibilité pour garantir
            l&apos;authenticité de chaque diplôme.
          </p>
        </div>
      </div>
    </section>
  );
};
