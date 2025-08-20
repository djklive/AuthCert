import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../components/ui/1.button";
import { Card, CardContent } from "../../../../components/ui/1.card";

const accountOptions = [
  {
    id: "establishment",
    title: "Protégez vos diplômes contre la fraude",
    subtitle: "CRÉER UN COMPTE ÉTABLISSEMENT",
    selected: true,
  },
  {
    id: "student",
    title: "Gérez vos certificats en toute sécurité",
    subtitle: "CRÉER UN COMPTE ÉTUDIANT",
    selected: false,
  },
];

export const SignUpSection = () => {
  const [selectedOption, setSelectedOption] = useState("establishment");

  return (
    <section className="w-full bg-[#f9fafb] py-12 lg:py-24 xl:py-[151px]">
      <div className="max-w-[1296px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-[179px] items-start">
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[60px] font-bold text-blue-900 leading-tight lg:leading-[66px]">
              Essayez gratuitement
            </h2>
            <p className="text-base lg:text-lg font-normal text-blue-600 leading-6 lg:leading-7 max-w-[556px]">
              Creer votre compte et profitez des bienfaits de notre application
            </p>
          </div>

          <div className="w-full max-w-[515px] space-y-4 mx-auto lg:mx-0">
            <div className="space-y-[15px]">
              {accountOptions.map((option) => (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedOption === option.id
                      ? "bg-blue-gray50 border-2 border-rose-500"
                      : "bg-basewhite border border-[#e5eaf1]"
                  }`}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div
                        className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedOption === option.id
                            ? "bg-rose-500"
                            : "bg-basewhite border-[1.5px] border-[#e5eaf1]"
                        }`}
                      >
                        <CheckIcon
                          className={`w-4 h-4 lg:w-6 lg:h-6 ${
                            selectedOption === option.id
                              ? "text-white"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-base lg:text-lg font-semibold text-blue-900 leading-6 lg:leading-7">
                          {option.title}
                        </h3>
                        <p className="text-sm lg:text-base font-normal text-blue-500 leading-5 lg:leading-6">
                          {option.subtitle}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              className="w-full h-12 lg:h-[60px] bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-6 py-4"
              size="lg"
            >
              <span className="[font-family:'Inter',Helvetica] font-semibold text-sm lg:text-base leading-5 lg:leading-6">
                Creer Votre Compte
              </span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
