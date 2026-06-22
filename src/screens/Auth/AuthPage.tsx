import "../../App.css";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { InputField } from "../../components/InputField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { TabNavigation } from "../../components/TabNavigation";
import { SignupFormApprenant } from "../../components/SignupFormApprenant";
import { SignupFormEtablissement } from "../../components/SignupFormEtablissement";
import { AlertBox } from "../../components/AlertBox";
import { ArrowLeftIcon, GraduationCapIcon, SchoolIcon, UserIcon } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "../../components/animations/ScrollAnimation";
import { useAuth } from "../../hooks/useAuth";
import authService from "../../services/authService";
import { Button } from "../../components/ui/button";
import { API_BASE } from "../../services/api";
import { ForgotPasswordModal } from "../../components/ForgotPasswordModal";

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

interface AuthPageProps {
  defaultTab?: "login" | "signup";
}

export default function AuthPage({ defaultTab = "login" }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false,
    role: "student" as "student" | "establishment"
  });
  const [signupTab, setSignupTab] = useState<"apprenant" | "etablissement">("apprenant");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Détecter le message de succès depuis l'URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const success = searchParams.get('success');
    
    if (success === 'apprenant') {
      setAlert({ type: "success", message: "Compte apprenant créé avec succès ! Vous pouvez maintenant vous connecter." });
      // Nettoyer l'URL
      navigate('/auth?tab=login', { replace: true });
    } else if (success === 'etablissement') {
      setAlert({ type: "info", message: "Demande d'inscription établissement soumise ! Votre compte sera validé sous 48-72h." });
      // Nettoyer l'URL
      navigate('/auth?tab=login', { replace: true });
    }
  }, [location.search, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password || !loginData.role) {
      setAlert({ type: "error", message: "Veuillez remplir tous les champs et sélectionner votre type de compte" });
      return;
    }

    setLoading(true);
    
    try {
      // Le rôle provient du sélecteur (apprenant/établissement). Le cas admin
      // est auto-détecté par le backend via l'email ; le rôle effectif est
      // ensuite lu depuis data.user.role.
      const userRole = loginData.role as "student" | "establishment";

      // Appel à l'API de connexion
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
          role: userRole
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Connexion réussie - sauvegarder le token JWT
        if (data.token) {
          authService.setAuth(data.token, data.user);
        }

        // Le rôle effectif est celui renvoyé par le backend
        const effectiveRole = (data.user?.role || userRole) as "student" | "establishment" | "admin";

        login(effectiveRole);
        setAlert({ type: "success", message: "Connexion réussie ! Redirection en cours..." });
        
        // Redirection vers le dashboard approprié selon le rôle renvoyé par le backend
        setTimeout(() => {
          navigate(`/dashboard?userType=${effectiveRole}`);
        }, 1000);
      } else {
        // Gestion des erreurs selon le statut
        if (data.status === 'EN_ATTENTE') {
          setAlert({ 
            type: "info", 
            message: data.message 
          });
        } else if (data.status === 'REJETE') {
          setAlert({ 
            type: "error", 
            message: data.message 
          });
        } else if (data.status === 'SUSPENDU') {
          setAlert({ 
            type: "error", 
            message: data.message 
          });
        } else {
          setAlert({ 
            type: "error", 
            message: data.message 
          });
        }
      }
      
    } catch {
      setAlert({ type: "error", message: "Erreur de connexion au serveur" });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Bouton retour*/}
      <div className="absolute top-4 left-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
      </div>
      <div className="w-full max-w-lg lg:max-w-lg xl:max-w-xl">
        {/* En-tête avec logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {/* <ShieldCheckIcon className="w-8 h-8 text-white" /> */}
            <img src="/Logo - 32.svg" alt="Logo" className="w-12 h-12" />
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
                  
                  {/* Sélecteur de rôle */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Type de compte <span className="text-[#F43F5E]">*</span></Label>
                    <Select 
                      value={loginData.role} 
                      onValueChange={(value) => setLoginData({ ...loginData, role: value as "student" | "establishment" })}
                    >
                      <SelectTrigger className="h-12 border-2 focus:border-[#F43F5E]">
                        <SelectValue placeholder="Sélectionnez votre type de compte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <span className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            Apprenant
                          </span>
                        </SelectItem>
                        <SelectItem value="establishment">
                          <span className="flex items-center gap-2">
                            <SchoolIcon className="w-4 h-4" />
                            Établissement
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                    <button 
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-sm text-[#F43F5E] hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
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
                    <SignupFormApprenant />
                  ) : (
                    <SignupFormEtablissement />
                  )}
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
      
      {/* Modal Mot de passe oublié */}
      <ForgotPasswordModal 
        isOpen={isForgotPasswordOpen} 
        onClose={() => setIsForgotPasswordOpen(false)} 
      />
    </div>
  );
}
