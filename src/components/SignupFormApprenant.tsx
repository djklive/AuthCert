import { useEffect, useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { MultiSelect } from "./ui/multi-select";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { api, type Establishment } from '../services/api';

const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

export interface SignupFormApprenantData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  etablissements: string[]; // Changé pour supporter plusieurs établissements
  acceptConditions: boolean;
}

export function SignupFormApprenant() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [establishmentsError, setEstablishmentsError] = useState<string>('');

  // Charger les établissements depuis l'API
  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    try {
      setLoadingEstablishments(true);
      setEstablishmentsError('');
      const data = await api.getEstablishments();
      console.log('Établissements chargés:', data); // Debug
      setEstablishments(data);
    } catch (err) {
      setEstablishmentsError('Erreur lors du chargement des établissements');
      console.error('Erreur chargement:', err);
    } finally {
      setLoadingEstablishments(false);
    }
  };

  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormApprenantData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    etablissements: [], // Changé pour supporter plusieurs établissements
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

    if(formData.etablissements.length === 0) {
      newErrors.etablissements = "Veuillez sélectionner au moins un établissement";
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
      const response = await axios.post(`${API_BASE_URL}/register/apprenant`, {
        email: formData.email,
        motDePasse: formData.password,
        nom: formData.lastName,
        prenom: formData.firstName,
        telephone: formData.phone || '',
        etablissements: formData.etablissements // Envoyer la liste des établissements
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

  /*const etablissements = [
    "Université de Kinshasa",
    "Université de Lubumbashi",
    "École Supérieure de Commerce",
    "Institut Supérieur Technique",
    "Autre"
  ];*/

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Affichage des erreurs API */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{apiError}</p>
        </div>
      )}
      <InputField
        label="Nom"
        type="text"
        placeholder="Entrez votre nom"
        required
        value={formData.lastName}
        onChange={(value) => setFormData({ ...formData, lastName: value })}
      />

      <InputField
        label="Prénom"
        type="text"
        placeholder="Entrez votre prénom"
        required
        value={formData.firstName}
        onChange={(value) => setFormData({ ...formData, firstName: value })}
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
        <Label className="text-gray-700">Établissements souhaités <span className="text-[#F43F5E]">*</span></Label>
        <p className="text-xs text-gray-500">Vous pouvez sélectionner plusieurs établissements pour recevoir vos certificats</p>
        
        {loadingEstablishments ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Chargement des établissements...
          </div>
        ) : establishmentsError ? (
          <div className="p-4 text-center text-sm text-red-500">
            {establishmentsError}
          </div>
        ) : establishments.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucun établissement actif disponible
          </div>
        ) : (
          <MultiSelect
            options={establishments.map(etab => ({
              label: etab.nomEtablissement,
              value: etab.nomEtablissement,
              description: etab.typeEtablissement
            }))}
            selected={formData.etablissements}
            onChange={(selected) => setFormData({ ...formData, etablissements: selected })}
            placeholder="Sélectionnez vos établissements..."
            disabled={loadingEstablishments}
          />
        )}
        
        {errors.etablissements && (
          <p className="text-sm text-[#F43F5E]">{errors.etablissements}</p>
        )}
        
        {formData.etablissements.length > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>{formData.etablissements.length}</strong> établissement{formData.etablissements.length > 1 ? 's' : ''} sélectionné{formData.etablissements.length > 1 ? 's' : ''}
            </p>
          </div>
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