import React from "react";
import { Separator } from "../../../../components/ui/1.separator";
import CountUp from "../../../../components/CountUp";

const metricsData = [
  {
    value: "123",
    label: "Certificat",
  },
  {
    value: "20",
    label: "Total utilisateur",
  },
];

export const PerformanceMetricsSection = () => {
  return (
    <section className="flex flex-col w-full items-center gap-8 lg:gap-16 px-4 sm:px-6 lg:px-8 py-12 lg:py-24 relative bg-white">
      <div className="flex flex-col w-full max-w-[1280px] items-start gap-6 lg:gap-8 relative">
        <div className="flex flex-col items-center gap-12 relative self-stretch w-full">
          <div className="flex flex-col w-full max-w-[768px] items-center gap-4 lg:gap-5 relative">
            <div className="flex flex-col items-center gap-6 relative self-stretch w-full">
              <div className="relative w-[70px] h-[66px] lg:w-[90px] lg:h-[86px]">
                <div className="relative w-[66px] h-[66px] lg:w-[86px] lg:h-[86px]">
                  {/* <div className="w-[27px] lg:w-[35px] top-[17px] lg:top-[22px] left-[28px] lg:left-[37px] text-3xl lg:text-5xl absolute [font-family:'Inter',Helvetica] font-black text-[#fffcfc] tracking-[0] leading-[normal] whitespace-nowrap">
                    C
                  </div>
                  <div className="w-[29px] lg:w-[37px] top-1 lg:top-1.5 left-[8px] lg:left-[11px] [font-family:'Inter',Helvetica] font-black text-[#faf7f7] text-3xl lg:text-5xl tracking-[0] leading-[normal] absolute whitespace-nowrap">
                    A
                  </div> */}
                  <img src="/Logo - 32.png" alt="Logo" className="w-24 h-24" />
                </div>
              </div>

              <h2 className="relative self-stretch text-2xl lg:text-3xl xl:text-[36px] font-semibold text-gray-900 text-center leading-tight lg:leading-[44px]">
                Certificats vérifiés
              </h2>
            </div>

            <p className="relative self-stretch text-lg lg:text-xl font-normal text-gray-500 text-center leading-6 lg:leading-7">
              certificats vérifiés en temps réel sur notre plateforme
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-[1280px] items-center gap-8 lg:gap-16 relative">
        <div className="flex flex-col sm:flex-row w-full max-w-[768px] items-center lg:items-start gap-8 sm:gap-4 relative">
          {metricsData.map((metric, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center gap-5 relative flex-1">
                <div className="flex flex-col lg:items-start gap-3 relative self-stretch w-full">
                  <div className="relative self-stretch mt-[-1.00px] text-3xl lg:text-4xl xl:text-[60px] font-semibold text-rose-500 text-center leading-tight lg:leading-[72px]">
                    <CountUp
                      from={0}
                      to={Number(metric.value)}
                      separator=","
                      direction="up"
                      duration={1}
                      className="count-up-text"
                    />
                    {/* {metric.value} */}
                  </div>
                  <div className="relative self-stretch text-base lg:text-lg font-medium text-gray-900 text-center leading-6 lg:leading-7">
                    {metric.label}
                  </div>
                </div>
              </div>
              {index < metricsData.length - 1 && (
                <>
                  <Separator
                    className="lg:hidden w-full my-4"
                  />
                  <Separator
                    orientation="vertical"
                    className="hidden lg:block h-[180px] w-px bg-gray-300"
                  />
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
