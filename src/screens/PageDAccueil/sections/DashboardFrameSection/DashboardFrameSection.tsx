import { AlertTriangleIcon } from "lucide-react";
//import React from "react";

export const DashboardFrameSection = () => {
  return (
    <section className="flex flex-col lg:flex-row items-start gap-8 lg:gap-[100px] justify-center w-full px-4 sm:px-6 lg:px-8">
      <div className="flex-1 max-w-[536px] order-2 lg:order-1">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <AlertTriangleIcon className="w-[30px] h-[30px] lg:w-[50px] lg:h-[50px] text-yellow-500 flex-shrink-0 mt-2" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[58px] font-[800] text-zinc-900 leading-tight lg:leading-[66px]">
              LE PROBLÈME : Un diplôme sur X au Cameroun est falsifié
            </h1>
          </div>

          <p className="text-base lg:text-lg font-normal text-gray-600 leading-6 lg:leading-7 max-w-[533px]">
            Des chiffres alarmants qui mettent en danger la confiance dans le
            système éducatif.
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 order-1 lg:order-2 w-full lg:w-auto">
        <img
          className="w-full max-w-[615px] h-auto lg:h-[404px] rounded-[10px] object-cover mx-auto"
          alt="Rectangle"
          src="/generated-image.png"
        />
      </div>
    </section>
  );
};
