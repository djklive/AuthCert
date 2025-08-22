import "../../App.css";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { InputField } from "../../components/InputField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { TabNavigation } from "../../components/TabNavigation";
import { SignupFormApprenant, type SignupFormApprenantData } from "../../components/SignupFormApprenant";
import { SignupFormEtablissement, type SignupFormEtablissementSubmit } from "../../components/SignupFormEtablissement";
import { AlertBox } from "../../components/AlertBox";
import { GraduationCapIcon, SchoolIcon } from "lucide-react";
import { AnimatedSection, AnimatedTitle, AnimatedCard } from "../../components/animations/ScrollAnimation";

interface AuthPageProps {
  defaultTab?: "login" | "signup";
}

export default function AuthPage({ defaultTab = "login" }: AuthPageProps) {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [signupTab, setSignupTab] = useState<"apprenant" | "etablissement">("apprenant");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: "success", message: "Connexion réussie ! Redirection en cours..." });
    }, 2000);
  };

  const handleSignupApprenant = async (_data: SignupFormApprenantData) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: "success", message: "Compte apprenant créé avec succès ! Vérifiez votre email." });
    }, 2000);
  };

  const handleSignupEtablissement = async (_data: SignupFormEtablissementSubmit) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: "info", message: "Demande soumise ! Votre compte sera validé sous 48-72h." });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg lg:max-w-lg xl:max-w-xl">
        {/* En-tête avec logo */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              {/* <ShieldCheckIcon className="w-8 h-8 text-white" /> */}
              <img src="/Logo - 32.svg" alt="Logo" />
            </div>
            <AnimatedTitle delay={0.2}>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Certification Diplômes
              </h1>
            </AnimatedTitle>
            <AnimatedSection delay={0.3}>
              <p className="text-gray-600">
                Plateforme sécurisée de certification de diplômes
              </p>
            </AnimatedSection>
          </div>
        </AnimatedSection>

        {/* Alerte */}
        {alert && (
          <AnimatedSection delay={0.1}>
            <AlertBox
              type={alert.type}
              message={alert.message}
              className="mb-6"
            />
          </AnimatedSection>
        )}

        <AnimatedCard delay={0.4}>
          <Card className="shadow-lg border-1 rounded-2xl overflow-hidden">
              {/* Corrige defaut taille */}
            <Tabs defaultValue={defaultTab} className="w-full max-w-lg mx-auto">
              <TabsList className="grid w-full grid-cols-2 bg-gray-50 m-4 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#F43F5E]">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#F43F5E]">
                  Inscription
                </TabsTrigger>
              </TabsList>

              {/* Formulaire de connexion */}
              <TabsContent value="login" className="mt-0">
                <CardHeader className="px-6 pb-4">
                  <AnimatedTitle delay={0.5}>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCapIcon className="w-5 h-5 text-[#F43F5E]" />
                      Se connecter
                    </CardTitle>
                  </AnimatedTitle>
                  <AnimatedSection delay={0.6}>
                    <CardDescription>
                      Accédez à votre espace personnel
                    </CardDescription>
                  </AnimatedSection>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <AnimatedSection delay={0.7}>
                      <InputField
                        label="Email ou identifiant"
                        type="email"
                        placeholder="votre@email.com"
                        required
                        value={loginData.email}
                        onChange={(value) => setLoginData({ ...loginData, email: value })}
                      />
                    </AnimatedSection>
                    <AnimatedSection delay={0.8}>
                      <InputField
                        label="Mot de passe"
                        type="password"
                        placeholder="Votre mot de passe"
                        required
                        value={loginData.password}
                        onChange={(value) => setLoginData({ ...loginData, password: value })}
                      />
                    </AnimatedSection>
                    <AnimatedSection delay={0.9}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={loginData.rememberMe}
                            onCheckedChange={(checked) =>
                              setLoginData({ ...loginData, rememberMe: checked as boolean })
                            }
                          />
                          <Label htmlFor="remember" className="text-sm text-gray-600">
                            Se souvenir de moi
                          </Label>
                        </div>
                        <a href="#" className="text-sm text-[#F43F5E] hover:underline">
                          Mot de passe oublié ?
                        </a>
                      </div>
                    </AnimatedSection>
                    <AnimatedSection delay={1.0}>
                      <PrimaryButton type="submit" loading={loading} className="mt-6">
                        Se connecter
                      </PrimaryButton>
                    </AnimatedSection>
                  </form>
                </CardContent>
              </TabsContent>

              {/* Formulaires d'inscription */}
              <TabsContent value="signup" className="mt-0">
                <CardHeader className="px-6 pb-4">
                  <AnimatedTitle delay={0.5}>
                    <CardTitle className="flex items-center gap-2">
                      <SchoolIcon className="w-5 h-5 text-[#F43F5E]" />
                      Créer un compte
                    </CardTitle>
                  </AnimatedTitle>
                  <AnimatedSection delay={0.6}>
                    <CardDescription>
                      Rejoignez notre plateforme de certification
                    </CardDescription>
                  </AnimatedSection>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <AnimatedSection delay={0.7}>
                      <TabNavigation
                        activeTab={signupTab}
                        onTabChange={setSignupTab}
                      />
                    </AnimatedSection>
                    <AnimatedSection delay={0.8}>
                      {signupTab === "apprenant" ? (
                        <SignupFormApprenant
                          onSubmit={handleSignupApprenant}
                          loading={loading}
                        />
                      ) : (
                        <SignupFormEtablissement
                          onSubmit={handleSignupEtablissement}
                          loading={loading}
                        />
                      )}
                    </AnimatedSection>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </AnimatedCard>

        {/* Pied de page */}
        <AnimatedSection delay={1.1}>
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>© 2025 Certification Diplômes. Tous droits réservés.</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="hover:text-[#F43F5E] transition-colors">
                Conditions d'utilisation
              </a>
              <a href="#" className="hover:text-[#F43F5E] transition-colors">
                Confidentialité
              </a>
              <a href="#" className="hover:text-[#F43F5E] transition-colors">
                Support
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
