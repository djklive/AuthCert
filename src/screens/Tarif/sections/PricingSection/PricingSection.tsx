import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Switch } from "../../../../components/ui/switch";

const pricingPlans = [
  {
    id: "free",
    title: "Gratuit, 30 jours d'essai",
    priceAnnual: "0 FCFA",
    priceMonthly: "0 FCFA",
    subtitle: "Par mois, facturé annuellement",
    features: ["Accès complet"],
    buttonVariant: "outline",
    buttonText: "Essayez-le maintenant",
  },
  {
    id: "pro",
    title: "Pro",
    priceAnnual: "25 000 FCFA",
    priceMonthly: "30 000 FCFA",
    subtitle: "Par mois, facturé annuellement",
    features: ["50 certificats", "Statistiques de base", "100GB Cloud Storage"],
    buttonVariant: "default",
    buttonText: "Essayez-le maintenant",
    highlighted: true,
  },
  {
    id: "exclusive",
    title: "Exclusive",
    priceAnnual: "55 000 FCFA",
    priceMonthly: "65 000 FCFA",
    subtitle: "Par mois, facturé annuellement",
    features: [
      "Certificats illimités",
      "Statistiques avancées",
      "Utilisateur illimités",
    ],
    buttonVariant: "outline",
    buttonText: "Essayez-le maintenant",
  },
];

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSwitchChange = (checked: boolean) => {
    setIsAnnual(checked);
  };

  return (
    <section className="w-full max-w-[1218px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="flex-1">
            <div className="mb-4">
              <div className="font-semi-bold-18px font-[number:var(--semi-bold-18px-font-weight)] text-rose-500 text-sm sm:text-base lg:text-[length:var(--semi-bold-18px-font-size)] tracking-[var(--semi-bold-18px-letter-spacing)] leading-[var(--semi-bold-18px-line-height)] [font-style:var(--semi-bold-18px-font-style)]">
                Plans et Abonnements – Réservés aux établissements
              </div>
            </div>
            <h2 className="font-bold-60px font-[number:var(--bold-60px-font-weight)] text-slate-900 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[length:var(--bold-60px-font-size)] tracking-[var(--bold-60px-letter-spacing)] leading-tight lg:leading-[var(--bold-60px-font-size)] [font-style:var(--bold-60px-font-style)] mb-6 sm:mb-8">
              Choisissez le plan qui vous suit le mieux
            </h2>
            <p className="font-inter-regular-16px font-[number:var(--inter-regular-16px-font-weight)] text-gray-600 text-sm sm:text-base lg:text-[length:var(--inter-regular-16px-font-size)] tracking-[var(--inter-regular-16px-letter-spacing)] leading-relaxed lg:leading-[var(--inter-regular-16px-line-height)] [font-style:var(--inter-regular-16px-font-style)] max-w-full lg:max-w-[578px]">
              L&apos;inscription est gratuite pour tous.
              <br />
              Seuls les établissements qui souhaitent émettre des certificats
              numériques sécurisés doivent souscrire un abonnement après 30
              jours d&apos;essai gratuit.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 lg:flex-shrink-0">
            <span
              className={`font-semi-bold-16px font-[number:var(--semi-bold-16px-font-weight)] text-sm sm:text-[length:var(--semi-bold-16px-font-size)] tracking-[var(--semi-bold-16px-letter-spacing)] leading-[var(--semi-bold-16px-line-height)] [font-style:var(--semi-bold-16px-font-style)] whitespace-nowrap transition-colors ${
                isAnnual ? "text-slate-900" : "opacity-60 text-gray-500"
              }`}
            >
              Annuellement
            </span>
            <div className="relative">
              <Switch
                checked={isAnnual}
                onCheckedChange={handleSwitchChange}
                className="data-[state=checked]:bg-rose-500 data-[state=unchecked]:bg-gray-300"
              />
            </div>
            <span
              className={`font-semi-bold-16px font-[number:var(--semi-bold-16px-font-weight)] text-sm sm:text-[length:var(--semi-bold-16px-font-size)] tracking-[var(--semi-bold-16px-letter-spacing)] leading-[var(--semi-bold-16px-line-height)] [font-style:var(--semi-bold-16px-font-style)] whitespace-nowrap transition-colors ${
                !isAnnual ? "text-slate-900" : "opacity-60 text-gray-500"
              }`}
            >
              Mensuel
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative bg-white rounded-lg border-0 shadow-sm h-auto min-h-[400px] sm:min-h-[450px] lg:h-[497px] ${
              plan.highlighted ? "ring-2 ring-rose-500 ring-offset-2" : "hover:ring-2 hover:ring-rose-500 hover:ring-offset-2"
            }`}
          >
            <CardContent className="p-0 h-full flex flex-col">
              <div className="p-4 sm:p-6 lg:p-8 pb-4 sm:pb-6 text-center">
                <div className="font-semi-bold-18px font-[number:var(--semi-bold-18px-font-weight)] text-rose-500 text-[length:var(--semi-bold-18px-font-size)] tracking-[var(--semi-bold-18px-letter-spacing)] leading-[var(--semi-bold-18px-font-size)] [font-style:var(--semi-bold-18px-font-style)] mb-4">
                  {plan.title}
                </div>
                <div className="font-bold-48px font-[number:var(--bold-48px-font-weight)] text-blue-900 text-2xl sm:text-3xl lg:text-[length:var(--bold-48px-font-size)] tracking-[var(--bold-48px-letter-spacing)] leading-tight lg:leading-[var(--bold-48px-font-size)] [font-style:var(--bold-48px-font-style)] mb-2">
                  {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                </div>
                <div className="font-regular-16px font-[number:var(--regular-16px-font-weight)] text-blue-500 text-sm sm:text-[length:var(--regular-16px-font-size)] tracking-[var(--regular-16px-letter-spacing)] leading-[var(--regular-16px-font-size)] [font-style:var(--regular-16px-font-style)]">
                  {isAnnual ? "Par mois, facturé annuellement" : "Par mois, facturé mensuellement"}
                </div>
              </div>

              <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
                <Button
                  className={`w-full h-auto py-3 sm:py-4 ${
                    plan.highlighted 
                      ? "bg-rose-500 hover:bg-rose-600 text-white" 
                      : "bg-white text-blue-900 border-2 border-slate-900 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                  } font-semi-bold-16px font-[number:var(--semi-bold-16px-font-weight)] text-sm sm:text-[length:var(--semi-bold-16px-font-size)] tracking-[var(--semi-bold-16px-letter-spacing)] leading-[var(--semi-bold-16px-font-size)] [font-style:var(--semi-bold-16px-font-style)] transition-colors`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.buttonText}
                </Button>
              </div>

              <div className="px-4 sm:px-6 lg:px-8 flex-1 pb-4 sm:pb-6 lg:pb-8">
                <div className="space-y-2 sm:space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="font-regular-16px font-[number:var(--regular-16px-font-weight)] text-blue-900 text-sm sm:text-[length:var(--regular-16px-font-size)] tracking-[var(--regular-16px-letter-spacing)] leading-relaxed sm:leading-[var(--regular-16px-font-size)] [font-style:var(--regular-16px-font-style)]">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
