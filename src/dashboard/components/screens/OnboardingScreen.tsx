import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Award, 
  QrCode, 
  Share2, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Shield,
  Users
} from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    title: "Bienvenue sur CertifiED",
    subtitle: "Votre plateforme de gestion de certificats numériques",
    description: "Gérez, partagez et vérifiez vos certificats en toute sécurité. Découvrez comment CertifiED peut transformer votre expérience d'apprentissage.",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    features: [
      "Interface moderne et intuitive",
      "Sécurité blockchain avancée",
      "Accessibilité mobile et desktop"
    ]
  },
  {
    id: 2,
    title: "Certificats Sécurisés",
    subtitle: "Vos achievements, protégés et vérifiables",
    description: "Chaque certificat est sécurisé par la blockchain et peut être vérifié instantanément par les employeurs et institutions.",
    icon: Shield,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    features: [
      "Vérification instantanée",
      "Sécurité blockchain",
      "Certificats infalsifiables"
    ]
  },
  {
    id: 3,
    title: "Partage Simplifié",
    subtitle: "QR codes et liens de partage intelligents",
    description: "Partagez vos certificats d'un simple scan QR ou via des liens sécurisés. Suivez qui consulte vos credentials en temps réel.",
    icon: Share2,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    features: [
      "QR codes dynamiques",
      "Liens de partage sécurisés",
      "Statistiques de consultation"
    ]
  }
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-xs">
              Étape {currentStep + 1} sur {onboardingSteps.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Passer
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className={`${step.bgColor} p-8 text-center`}>
              <div className={`inline-flex items-center justify-center w-20 h-20 ${step.bgColor} rounded-2xl mb-6 border-2 border-white/20`}>
                <Icon className={`h-10 w-10 ${step.color}`} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {step.title}
              </h1>
              <p className="text-muted-foreground text-lg">
                {step.subtitle}
              </p>
            </div>

            {/* Description */}
            <div className="p-8">
              <p className="text-center text-muted-foreground mb-8 leading-relaxed">
                {step.description}
              </p>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {step.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${step.color.replace('text-', 'bg-')}`} />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Visual Preview */}
              <div className="bg-muted/30 rounded-2xl p-6 mb-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card rounded-xl p-4 text-center">
                    <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Certificats</p>
                  </div>
                  <div className="bg-card rounded-xl p-4 text-center">
                    <QrCode className="h-8 w-8 text-chart-2 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">QR Codes</p>
                  </div>
                  <div className="bg-card rounded-xl p-4 text-center">
                    <Users className="h-8 w-8 text-chart-4 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Partage</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="rounded-xl"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          <div className="flex space-x-2">
            {onboardingSteps.map((_, index) => (
              <button
                title="Passer à l'étape suivante"
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="rounded-xl">
            {currentStep === onboardingSteps.length - 1 ? 'Commencer' : 'Suivant'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}