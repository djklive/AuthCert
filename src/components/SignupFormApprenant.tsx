import { useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export interface SignupFormApprenantData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  etablissement: string;
  acceptConditions: boolean;
}

export function SignupFormApprenant() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormApprenantData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    etablissement: "",
    acceptConditions: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    
    if (formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }

    if(!formData.etablissement) {
      newErrors.etablissement = "Veuillez sélectionner un établissement";
    }
    
    if (!formData.acceptConditions) {
      newErrors.acceptConditions = "Vous devez accepter les conditions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Nettoyer les erreurs API précédentes
    setApiError('');
    setIsSubmitting(true);
    
    try {
      // Appel à l'API avec les bonnes données
      const response = await axios.post('http://localhost:5000/api/register/apprenant', {
        email: formData.email,
        motDePasse: formData.password,
        nom: formData.fullName.split(' ')[0] || formData.fullName,
        prenom: formData.fullName.split(' ').slice(1).join(' ') || formData.fullName.split(' ')[0] || formData.fullName,
        telephone: formData.phone || '',
        etablissement: formData.etablissement
      });
      
      if (response.data.success) {
        // Redirection vers la page de connexion avec message de succès
        navigate('/auth?tab=login&success=apprenant');
      }
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      // Gestion d'erreur améliorée
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
        setApiError((error.response.data as { message: string }).message);
      } else {
        setApiError('Erreur lors de l\'inscription');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const etablissements = [
    "Université de Kinshasa",
    "Université de Lubumbashi",
    "École Supérieure de Commerce",
    "Institut Supérieur Technique",
    "Autre"
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Affichage des erreurs API */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{apiError}</p>
        </div>
      )}
      <InputField
        label="Nom complet"
        type="text"
        placeholder="Entrez votre nom complet"
        required
        value={formData.fullName}
        onChange={(value) => setFormData({ ...formData, fullName: value })}
      />

      <InputField
        label="Adresse email"
        type="email"
        placeholder="exemple@email.com"
        required
        value={formData.email}
        onChange={(value) => setFormData({ ...formData, email: value })}
      />

      <InputField
        label="Mot de passe"
        type="password"
        placeholder="Créez un mot de passe sécurisé"
        required
        value={formData.password}
        onChange={(value) => setFormData({ ...formData, password: value })}
        error={errors.password}
      />

      <InputField
        label="Confirmer le mot de passe"
        type="password"
        placeholder="Confirmez votre mot de passe"
        required
        value={formData.confirmPassword}
        onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
        error={errors.confirmPassword}
      />

      <InputField
        label="Téléphone"
        type="tel"
        placeholder="+243 XXX XXX XXX (optionnel)"
        value={formData.phone}
        onChange={(value) => setFormData({ ...formData, phone: value })}
      />

      <div className="space-y-2">
        <Label className="text-gray-700">Établissement souhaité <span className="text-[#F43F5E]">*</span></Label>
        <Select onValueChange={(value) => setFormData({ ...formData, etablissement: value })}>
          <SelectTrigger className="h-12 border-2 focus:border-[#F43F5E]">
            <SelectValue placeholder="Sélectionnez un établissement" />
          </SelectTrigger>
          <SelectContent className="bg-white border-2 border-gray-200 shadow-lg rounded-lg">
            {etablissements.map((etablissement) => (
              <SelectItem 
                key={etablissement} 
                value={etablissement}
                className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer"
              >
                {etablissement}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.etablissement && (
          <p className="text-sm text-[#F43F5E]">{errors.etablissement}</p>
        )}
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="conditions"
          checked={formData.acceptConditions}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, acceptConditions: checked as boolean })
          }
        />
        <Label htmlFor="conditions" className="text-sm text-gray-600 leading-relaxed">
          J'accepte les{" "}
          <a href="#" className="text-[#F43F5E] hover:underline">
            conditions d'utilisation
          </a>{" "}
          et la{" "}
          <a href="#" className="text-[#F43F5E] hover:underline">
            politique de confidentialité
          </a>
        </Label>
        {errors.acceptConditions && (
          <p className="text-sm text-[#F43F5E]">{errors.acceptConditions}</p>
        )}
      </div>

      <PrimaryButton type="submit" loading={isSubmitting} className="mt-6">
        Créer mon compte
      </PrimaryButton>
    </form>
  );
}