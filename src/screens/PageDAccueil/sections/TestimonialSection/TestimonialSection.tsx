//import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/1.avatar";

export const TestimonialSection = () => {
  return (
    <section className="flex flex-col w-full items-center gap-8 lg:gap-16 px-4 sm:px-6 lg:px-8 py-12 lg:py-24 relative bg-gray-50">
      <div className="flex flex-col w-full max-w-[1280px] items-start gap-6 lg:gap-8 relative">
        <div className="flex flex-col items-center gap-10 relative self-stretch w-full">
          <div className="flex flex-col items-center gap-6 lg:gap-8 relative self-stretch w-full">
            <div className="inline-flex items-center gap-6 relative">
              <img
                className="relative w-12 h-12 lg:w-16 lg:h-16 object-cover"
                alt="logo Vision Pub"
                src="/logo Vision Pub.jpeg"
              />

              <div className="relative w-fit [font-family:'Inter',Helvetica] font-semibold text-black text-sm lg:text-base text-center tracking-[0] leading-5 lg:leading-6 whitespace-nowrap">
                Vision Pub
              </div>
            </div>

            <div className="relative self-stretch text-xl sm:text-2xl lg:text-3xl xl:text-[48px] font-medium text-gray-900 text-center leading-tight lg:leading-[60px] px-4">
              &quot;Fiable et rapide, nous vérifions maintenant tous les
              diplômes facilement.&quot;
            </div>

            <div className="flex flex-col items-center gap-4 relative self-stretch w-full">
              <Avatar className="w-16 h-16 lg:w-24 lg:h-24">
                <AvatarImage src="/avatar.svg" alt="Fritz Enolla" />
                <AvatarFallback className="bg-avatar-user-squarecandice-wu-color-background">
                  FE
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-start gap-1 relative self-stretch w-full">
                <div className="relative self-stretch mt-[-1.00px] text-base lg:text-lg font-medium text-gray-900 text-center leading-6 lg:leading-7">
                  Fritz Enolla
                </div>

                <div className="relative self-stretch text-sm lg:text-base font-normal text-gray-500 text-center leading-5 lg:leading-6">
                  Directeur general, Vision Pub
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
