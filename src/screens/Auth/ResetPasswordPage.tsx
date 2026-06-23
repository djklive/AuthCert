import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AlertBox } from '../../components/AlertBox';
import { Button } from '../../components/ui/button';
import { ArrowLeftIcon, LockIcon, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { AnimatedSection, AnimatedCard } from '../../components/animations/ScrollAnimation';
import { API_BASE } from '../../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Vérifier la validité du token au chargement
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setAlert({ type: 'error', message: 'Lien invalide. Aucun token fourni.' });
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.success) {
          setTokenValid(true);
          setUserEmail(data.data.email);
        } else {
          setAlert({ type: 'error', message: data.message || 'Lien invalide ou expiré' });
        }
      } catch (err) {
        setAlert({ type: 'error', message: 'Erreur de connexion au serveur' });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    // Validation
    if (newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
        setAlert({ type: 'success', message: data.message });
        
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          navigate('/auth?tab=login');
        }, 3000);
      } else {
        setAlert({ type: 'error', message: data.message || 'Erreur lors de la réinitialisation' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Erreur de connexion au serveur' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Bouton retour */}
      <div className="absolute top-4 left-4">
        <Button variant="outline" onClick={() => navigate('/auth')}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* En-tête avec logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/Logo - 32.svg" alt="Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Réinitialisation du mot de passe
          </h1>
          <p className="text-gray-600">
            Créez un nouveau mot de passe sécurisé
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

        <AnimatedCard delay={0.3}>
          <Card className="shadow-lg border-1 rounded-2xl overflow-hidden">
            {verifying ? (
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 text-[#F43F5E] animate-spin mb-4" />
                  <p className="text-gray-600">Vérification du lien...</p>
                </div>
              </CardContent>
            ) : !tokenValid ? (
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Lien invalide ou expiré</h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    Ce lien de réinitialisation n'est plus valide. Veuillez demander un nouveau lien.
                  </p>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="bg-[#F43F5E] hover:bg-[#F43F5E]/90"
                  >
                    Retour à la connexion
                  </Button>
                </div>
              </CardContent>
            ) : resetSuccess ? (
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Mot de passe réinitialisé !</h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    Votre mot de passe a été modifié avec succès. Redirection vers la page de connexion...
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirection en cours...
                  </div>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="px-6 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <LockIcon className="w-5 h-5 text-[#F43F5E]" />
                    Nouveau mot de passe
                  </CardTitle>
                  <CardDescription>
                    Pour {userEmail}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField
                      label="Nouveau mot de passe"
                      type="password"
                      placeholder="Au moins 6 caractères"
                      required
                      value={newPassword}
                      onChange={setNewPassword}
                    />

                    <InputField
                      label="Confirmer le mot de passe"
                      type="password"
                      placeholder="Confirmez votre mot de passe"
                      required
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                    />

                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2">
                        Conseils pour un mot de passe sécurisé :
                      </h4>
                      <ul className="text-xs text-green-700 space-y-1 ml-4 list-disc">
                        <li>Au moins 6 caractères</li>
                        <li>Mélangez majuscules et minuscules</li>
                        <li>Incluez des chiffres et symboles</li>
                        <li>Évitez les mots du dictionnaire</li>
                      </ul>
                    </div>

                    <PrimaryButton 
                      type="submit" 
                      loading={loading} 
                      className="mt-6 w-full"
                      disabled={!newPassword || !confirmPassword}
                    >
                      {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </PrimaryButton>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </AnimatedCard>

        {/* Pied de page */}
        <AnimatedSection delay={0.5}>
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>Vous vous souvenez de votre mot de passe ?</p>
            <Button
              variant="link"
              className="text-[#F43F5E] hover:underline mt-2"
              onClick={() => navigate('/auth')}
            >
              Retour à la connexion
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}

