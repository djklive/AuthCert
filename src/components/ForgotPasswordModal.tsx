import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { InputField } from './InputField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { AlertBox } from './AlertBox';
import { Mail, ArrowRight, CheckCircle, Loader2, UserIcon, SchoolIcon } from 'lucide-react';
import { API_BASE } from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'student' | 'establishment'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    setResetLink('');

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          userType
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // En développement, afficher le lien
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        setError(data.message || 'Erreur lors de la demande de réinitialisation');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setUserType('student');
    setError('');
    setSuccess(false);
    setResetLink('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-[#F43F5E]" />
            Mot de passe oublié ?
          </DialogTitle>
          <DialogDescription>
            {success 
              ? 'Instructions envoyées avec succès'
              : 'Entrez votre email pour recevoir un lien de réinitialisation'
            }
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <AlertBox type="error" message={error} />
            )}

            <InputField
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              required
              value={email}
              onChange={setEmail}
            />

            <div className="space-y-2">
              <Label className="text-gray-700">Type de compte <span className="text-[#F43F5E]">*</span></Label>
              <Select value={userType} onValueChange={(value) => setUserType(value as 'student' | 'establishment')}>
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

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Un lien de réinitialisation sera envoyé à cette adresse. Le lien est valable pendant 1 heure.
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="bg-[#F43F5E] hover:bg-[#F43F5E]/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Envoyer le lien
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Email envoyé !</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email contenant un lien de réinitialisation.
              </p>
              
              {resetLink && (
                <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    🔧 Mode Développement
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :
                  </p>
                  <a 
                    href={resetLink} 
                    className="text-xs text-blue-600 underline break-all"
                    onClick={handleClose}
                  >
                    {resetLink}
                  </a>
                </div>
              )}

              <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <p className="text-sm text-blue-700">
                  💡 Vérifiez votre boîte de réception et vos spams. Le lien expire dans 1 heure.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleClose}
                className="w-full bg-[#F43F5E] hover:bg-[#F43F5E]/90"
              >
                Compris
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

