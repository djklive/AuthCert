import { DownloadIcon } from "lucide-react";
//import React from "react";
import { Header } from "../../components/Header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { AnimatedSection, AnimatedTitle, AnimatedImage, AnimatedCard } from "../../components/animations/ScrollAnimation";

export const VerifierCertificat = () => {
  return (
    <div className="min-h-screen bg-neutral-50 w-full">
      <Header activePage="Verifier Certificat" />

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <AnimatedSection delay={0.1}>
            <div className="flex justify-center mb-6 lg:mb-8">
              <Badge
                variant="secondary"
                className="px-6 py-2 bg-[#ffffff99] rounded-[60px] border border-zinc-200 backdrop-blur-[7px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(7px)_brightness(100%)] text-sm sm:text-base"
              >
                <span className="font-semibold text-gray-900">
                  Émission sécurisée et traçabilité 100% blockchain
                </span>
              </Badge>
            </div>
          </AnimatedSection>

          {/* Title Section */}
          <AnimatedSection delay={0.2}>
            <div className="mb-8 lg:mb-12 relative">
              {/* Decorative Vector - Hidden on mobile */}
              <AnimatedImage
                src="/Vector 10.svg"
                alt="Vector"
                className="hidden sm:block absolute left-52 transform -translate-x-1/2 top-12 lg:top-16 w-32 sm:w-48 lg:w-[259px] h-auto opacity-50"
                delay={0.3}
              />
              
              <AnimatedTitle delay={0.4}>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[52px] font-bold text-gray-900 leading-tight lg:leading-[62px] px-4">
                  Vérifiez instantanément l'authenticité des certificats.
                </h1>
              </AnimatedTitle>
            </div>
          </AnimatedSection>

          {/* Description */}
          <AnimatedSection delay={0.5}>
            <p className="text-base lg:text-lg text-gray-600 leading-relaxed mb-12 lg:mb-16 max-w-2xl mx-auto px-4">
              Blockchain sécurisée, QR code fluides, confiance certifiée.
              Notre solution révolutionne la vérification des certificats,
              garantissant une transparence totale et une sécurité inégalée.
            </p>
          </AnimatedSection>

          {/* Verification Card */}
          <AnimatedSection delay={0.6}>
            <div className="flex justify-center">
              <AnimatedCard delay={0.7}>
                <Card className="w-full max-w-lg bg-white rounded-[10px] border-0 shadow-lg">
                  <CardContent className="p-6 sm:p-8">
                    {/* Upload Section */}
                    <div className="mb-8">
                      <label className="block text-left font-medium text-black text-base mb-3">
                        Verification certificat
                      </label>
                      
                      <div className="relative bg-basewhite rounded-[9px] border border-zinc-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors min-h-[65px] flex items-center justify-center">
                        <div className="flex items-center gap-3">
                          <DownloadIcon className="w-6 h-6 text-gray-600 flex-shrink-0" />
                          <span className="font-medium text-black text-base text-center">
                            Telecharger certificat
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Verify Button */}
                    <div className="relative">
                      <div className="absolute inset-0 blur-[22.5px] bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 opacity-30 rounded-[10px]" />
                      <Button className="relative w-full h-14 bg-rose-500 hover:bg-rose-600 rounded-[10px] text-white font-bold text-lg">
                        VERIFIER
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
};