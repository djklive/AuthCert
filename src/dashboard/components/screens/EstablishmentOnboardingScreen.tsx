import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Upload, Palette, FileSignature, ArrowRight, ArrowLeft, Building2, Check } from 'lucide-react';

interface EstablishmentOnboardingScreenProps {
  onComplete: () => void;
}

export function EstablishmentOnboardingScreen({ onComplete }: EstablishmentOnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [establishmentName, setEstablishmentName] = useState('');
  const [establishmentLogo, setEstablishmentLogo] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#f43f5e');
  const [hasSignature, setHasSignature] = useState(false);

  const steps = [
    {
      title: 'Informations de base',
      description: 'Configurez les informations de votre établissement'
    },
    {
      title: 'Identité visuelle',
      description: 'Personnalisez l\'apparence de vos certificats'
    },
    {
      title: 'Configuration terminée',
      description: 'Votre établissement est prêt à émettre des certificats'
    }
  ];

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEstablishmentLogo(file);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Configuration de votre établissement
          </h1>
          <p className="text-muted-foreground">
            Étape {currentStep} sur 3 - {steps[currentStep - 1].description}
          </p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Building2 className="h-5 w-5 text-primary" />}
              {currentStep === 2 && <Palette className="h-5 w-5 text-primary" />}
              {currentStep === 3 && <Check className="h-5 w-5 text-primary" />}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="establishmentName">Nom de l'établissement *</Label>
                  <Input
                    id="establishmentName"
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    placeholder="École Supérieure de Commerce"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo de l'établissement</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                    {establishmentLogo ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium">{establishmentLogo.name}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEstablishmentLogo(null)}
                        >
                          Changer le logo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                        <div>
                          <Button variant="outline" asChild className="rounded-xl">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                              Télécharger un logo
                              <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG jusqu'à 2MB. Recommandé : 200x200px
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Couleur principale des certificats</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-12 rounded-xl border border-border cursor-pointer"
                      />
                    </div>
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#f43f5e"
                      className="h-12 rounded-xl flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cette couleur sera utilisée comme couleur principale sur vos certificats
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Signature numérique (optionnel)</Label>
                  <div className="border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id="hasSignature"
                          checked={hasSignature}
                          onChange={(e) => setHasSignature(e.target.checked)}
                          className="rounded border-border"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="hasSignature" className="cursor-pointer">
                          Ajouter une signature numérique
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Une signature officielle sera ajoutée à tous vos certificats pour renforcer leur authenticité
                        </p>
                      </div>
                    </div>

                    {hasSignature && (
                      <div className="mt-4 p-4 bg-accent/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileSignature className="h-4 w-4" />
                          La signature sera configurée après la validation de votre établissement
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Aperçu du certificat</Label>
                  <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-background to-accent/10">
                    <div className="aspect-[4/3] bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center space-y-4">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {establishmentLogo ? (
                          <span className="text-xs">Logo</span>
                        ) : (
                          <Building2 className="h-8 w-8" />
                        )}
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-bold text-lg">{establishmentName || 'Votre Établissement'}</h3>
                        <p className="text-sm text-muted-foreground">Certificat de Réussite</p>
                        <div className="w-20 h-1 rounded-full mx-auto" style={{ backgroundColor: primaryColor }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Configuration terminée !</h3>
                  <p className="text-muted-foreground">
                    Votre établissement <strong>{establishmentName}</strong> est maintenant configuré et prêt à émettre des certificats numériques.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <div className="p-4 border border-border rounded-xl">
                    <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Profil configuré</h4>
                    <p className="text-xs text-muted-foreground">Logo et couleurs définis</p>
                  </div>
                  <div className="p-4 border border-border rounded-xl">
                    <FileSignature className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Certificats prêts</h4>
                    <p className="text-xs text-muted-foreground">Modèles personnalisés</p>
                  </div>
                  <div className="p-4 border border-border rounded-xl">
                    <Check className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Sécurité activée</h4>
                    <p className="text-xs text-muted-foreground">Blockchain intégrée</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button onClick={handleNext} className="rounded-xl">
                {currentStep === 3 ? 'Accéder au dashboard' : 'Continuer'}
                {currentStep < 3 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}