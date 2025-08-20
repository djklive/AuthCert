import { LockIcon, MessageSquareIcon, QrCodeIcon } from "lucide-react";
import React from "react";
import { Separator } from "../../../../components/ui/1.separator";

export const FeaturesOverviewSection = () => {
  const features = [
    {
      icon: QrCodeIcon,
      title: "SCAN QR CODE",
      description:
        "Scanner un code QR en moins de 5 secondes – authentification sans effort et sans délai",
    },
    {
      icon: LockIcon,
      title: "VÉRIFIER EN LIGNE",
      description:
        "Vérification 24h/24, 7j/7 – accès permanent à l'historique des certificats",
    },
    {
      icon: MessageSquareIcon,
      title: "STATISTIQUES (EN TEMPS RÉEL)",
      description:
        "Tableau de bord en temps réel – données analytiques instantanées pour un pilotage éclairé",
    },
  ];

  return (
    <section className="w-full bg-white py-8 lg:py-16">
      <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {features.map((feature, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-start max-w-[334px] w-full">
              <feature.icon className="w-[25px] h-[25px] lg:w-[35px] lg:h-[35px] mb-6 lg:mb-12 text-rose-500" />
              <h3 className="text-base lg:text-lg font-bold text-zinc-900 leading-6 lg:leading-6 mb-3 lg:mb-4">
                {feature.title}
              </h3>
              <p className="text-sm lg:text-base font-normal text-gray-600 leading-5 lg:leading-6">
                {feature.description}
              </p>
            </div>
            {index < features.length - 1 && (
              <>
              <Separator
                className="lg:hidden w-full my-4"
              />
              <Separator
                orientation="vertical"
                className="hidden lg:block h-[211px] w-px bg-gray-300"
              />
              </>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};
