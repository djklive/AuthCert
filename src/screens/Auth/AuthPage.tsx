import "../../App.css";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { InputField } from "../../components/InputField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { TabNavigation } from "../../components/TabNavigation";
import { SignupFormApprenant } from "../../components/SignupFormApprenant";
import { SignupFormEtablissement } from "../../components/SignupFormEtablissement";
import { AlertBox } from "../../components/AlertBox";
import { GraduationCapIcon, SchoolIcon, ShieldCheckIcon } from "lucide-react";

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

  const handleSignupApprenant = async (data: any) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: "success", message: "Compte apprenant créé avec succès ! Vérifiez votre email." });
    }, 2000);
  };

  const handleSignupEtablissement = async (data: any) => {
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F43F5E] rounded-full mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Certification Diplômes
          </h1>
          <p className="text-gray-600">
            Plateforme sécurisée de certification de diplômes
          </p>
        </div>

        {/* Alerte */}
        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            className="mb-6"
          />
        )}

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
                <CardTitle className="flex items-center gap-2">
                  <GraduationCapIcon className="w-5 h-5 text-[#F43F5E]" />
                  Se connecter
                </CardTitle>
                <CardDescription>
                  Accédez à votre espace personnel
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <InputField
                    label="Email ou identifiant"
                    type="email"
                    placeholder="votre@email.com"
                    required
                    value={loginData.email}
                    onChange={(value) => setLoginData({ ...loginData, email: value })}
                  />
                  <InputField
                    label="Mot de passe"
                    type="password"
                    placeholder="Votre mot de passe"
                    required
                    value={loginData.password}
                    onChange={(value) => setLoginData({ ...loginData, password: value })}
                  />
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
                  <PrimaryButton type="submit" loading={loading} className="mt-6">
                    Se connecter
                  </PrimaryButton>
                </form>
              </CardContent>
            </TabsContent>

            {/* Formulaires d'inscription */}
            <TabsContent value="signup" className="mt-0">
              <CardHeader className="px-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <SchoolIcon className="w-5 h-5 text-[#F43F5E]" />
                  Créer un compte
                </CardTitle>
                <CardDescription>
                  Rejoignez notre plateforme de certification
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-6">
                  <TabNavigation
                    activeTab={signupTab}
                    onTabChange={setSignupTab}
                  />
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
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Pied de page */}
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
      </div>
    </div>
  );
}
