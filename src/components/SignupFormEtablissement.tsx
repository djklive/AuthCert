import { useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export interface EtablissementDocuments {
  rccmDocument: File | null;
  autorisation: File | null;
  pieceIdentite: File | null;
  logo: File | null;
  plaquette: File | null;
}

export interface EtablissementFormValues {
  nomEtablissement: string;
  emailInstitutionnel: string;
  password: string;
  rccm: string;
  typeEtablissement: string;
  adresse: string;
  telephone: string;
  nomRepresentant: string;
  emailRepresentant: string;
  telephoneRepresentant: string;
  acceptConditions: boolean;
}

export type SignupFormEtablissementSubmit = EtablissementFormValues & { documents: EtablissementDocuments };

export function SignupFormEtablissement() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EtablissementFormValues>({
    nomEtablissement: "",
    emailInstitutionnel: "",
    password: "",
    rccm: "",
    typeEtablissement: "",
    adresse: "",
    telephone: "",
    nomRepresentant: "",
    emailRepresentant: "",
    telephoneRepresentant: "",
    acceptConditions: false
  });

  const [documents, setDocuments] = useState<EtablissementDocuments>({
    rccmDocument: null,
    autorisation: null,
    pieceIdentite: null,
    logo: null,
    plaquette: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validation du mot de passe
    if (formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }
    
    // Validation des conditions
    if (!formData.acceptConditions) {
      newErrors.acceptConditions = "Vous devez accepter les conditions";
    }
    
    // Validation des documents requis
    if (!documents.rccmDocument) {
      newErrors.rccmDocument = "Le document RCCM est requis";
    }
    
    if (!documents.autorisation) {
      newErrors.autorisation = "L'autorisation de fonctionnement est requise";
    }
    
    if (!documents.pieceIdentite) {
      newErrors.pieceIdentite = "La pièce d'identité du représentant est requise";
    }
    
    // Validation des types de fichiers
    Object.entries(documents).forEach(([key, file]) => {
      if (file && !['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        newErrors[key] = "Type de fichier non supporté. Utilisez PDF, JPG ou PNG";
      }
    });
    
    // Validation de la taille des fichiers (max 5MB)
    Object.entries(documents).forEach(([key, file]) => {
      if (file && file.size > 5 * 1024 * 1024) { // 5MB en bytes
        newErrors[key] = "Le fichier est trop volumineux. Taille maximum : 5MB";
      }
    });
    
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
        // Créer FormData pour l'upload des fichiers
        const formDataToSend = new FormData();
        
        // Ajouter les champs texte
        formDataToSend.append('nomEtablissement', formData.nomEtablissement);
        formDataToSend.append('emailEtablissement', formData.emailInstitutionnel);
        formDataToSend.append('motDePasseEtablissement', formData.password);
        formDataToSend.append('rccmEtablissement', formData.rccm);
        formDataToSend.append('typeEtablissement', formData.typeEtablissement);
        formDataToSend.append('adresseEtablissement', formData.adresse);
        formDataToSend.append('telephoneEtablissement', formData.telephone);
        formDataToSend.append('nomResponsableEtablissement', formData.nomRepresentant);
        formDataToSend.append('emailResponsableEtablissement', formData.emailRepresentant);
        formDataToSend.append('telephoneResponsableEtablissement', formData.telephoneRepresentant);
        
        // Ajouter les fichiers
        if (documents.rccmDocument) {
          formDataToSend.append('rccmDocument', documents.rccmDocument);
        }
        if (documents.autorisation) {
          formDataToSend.append('autorisation', documents.autorisation);
        }
        if (documents.pieceIdentite) {
          formDataToSend.append('pieceIdentite', documents.pieceIdentite);
        }
        if (documents.logo) {
          formDataToSend.append('logo', documents.logo);
        }
        if (documents.plaquette) {
          formDataToSend.append('plaquette', documents.plaquette);
        }

        // Appel à l'API avec FormData (fichiers inclus)
        const response = await axios.post('http://localhost:5000/api/register/etablissement/upload', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      
      if (response.data.success) {
        // Redirection vers la page de connexion avec message de succès
        navigate('/auth?tab=login&success=etablissement');
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

  const typesEtablissement = [
    "Université publique",
    "Université privée",
    "Institut supérieur",
    "École technique",
    "Centre de formation",
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
      
      {/* Informations de l'établissement */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Informations de l'établissement</h3>
        
        <InputField
          label="Nom de l'établissement"
          type="text"
          placeholder="Nom complet de votre établissement"
          required
          value={formData.nomEtablissement}
          onChange={(value) => setFormData({ ...formData, nomEtablissement: value })}
        />

        <InputField
          label="Email institutionnel"
          type="email"
          placeholder="contact@etablissement.edu"
          required
          value={formData.emailInstitutionnel}
          onChange={(value) => setFormData({ ...formData, emailInstitutionnel: value })}
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
          label="Numéro RCCM"
          type="text"
          placeholder="CD/KIN/RCCM/XX-X-XXXXX"
          required
          value={formData.rccm}
          onChange={(value) => setFormData({ ...formData, rccm: value })}
        />

        <div className="space-y-2">
          <Label className="text-gray-700">Type d'établissement <span className="text-[#F43F5E]">*</span></Label>
          <Select onValueChange={(value) => setFormData({ ...formData, typeEtablissement: value })}>
            <SelectTrigger className="h-12 border-2 focus:border-[#F43F5E]">
              <SelectValue placeholder="Sélectionnez le type d'établissement" />
            </SelectTrigger>
            <SelectContent>
              {typesEtablissement.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Adresse complète <span className="text-[#F43F5E]">*</span></Label>
          <Textarea
            placeholder="Adresse complète de votre établissement"
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            className="min-h-[80px] border-2 focus:border-[#F43F5E]"
          />
        </div>

        <InputField
          label="Téléphone"
          type="tel"
          placeholder="+243 XXX XXX XXX"
          required
          value={formData.telephone}
          onChange={(value) => setFormData({ ...formData, telephone: value })}
        />
      </div>

      {/* Informations du représentant */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Informations du représentant</h3>
        
        <InputField
          label="Nom du représentant"
          type="text"
          placeholder="Nom complet du représentant légal"
          required
          value={formData.nomRepresentant}
          onChange={(value) => setFormData({ ...formData, nomRepresentant: value })}
        />

        <InputField
          label="Email du représentant"
          type="email"
          placeholder="representant@etablissement.edu"
          required
          value={formData.emailRepresentant}
          onChange={(value) => setFormData({ ...formData, emailRepresentant: value })}
        />

        <InputField
          label="Téléphone du représentant"
          type="tel"
          placeholder="+243 XXX XXX XXX"
          required
          value={formData.telephoneRepresentant}
          onChange={(value) => setFormData({ ...formData, telephoneRepresentant: value })}
        />
      </div>

      {/* Documents justificatifs */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Documents justificatifs</h3>
        
        <InputField
          label="Document RCCM"
          type="file"
          placeholder="Télécharger le document RCCM"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onFileChange={(file) => setDocuments({ ...documents, rccmDocument: file })}
        />
        {errors.rccmDocument && (
          <p className="text-sm text-[#F43F5E]">{errors.rccmDocument}</p>
        )}

        <InputField
          label="Autorisation d'exercer"
          type="file"
          placeholder="Télécharger l'autorisation"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onFileChange={(file) => setDocuments({ ...documents, autorisation: file })}
        />
        {errors.autorisation && (
          <p className="text-sm text-[#F43F5E]">{errors.autorisation}</p>
        )}

        <InputField
          label="Pièce d'identité du représentant"
          type="file"
          placeholder="Télécharger la pièce d'identité"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onFileChange={(file) => setDocuments({ ...documents, pieceIdentite: file })}
        />
        {errors.pieceIdentite && (
          <p className="text-sm text-[#F43F5E]">{errors.pieceIdentite}</p>
        )}

        <InputField
          label="Logo de l'établissement (optionnel)"
          type="file"
          placeholder="Télécharger le logo"
          accept=".jpg,.jpeg,.png,.svg"
          onFileChange={(file) => setDocuments({ ...documents, logo: file })}
        />
        {errors.logo && (
          <p className="text-sm text-[#F43F5E]">{errors.logo}</p>
        )}

        <InputField
          label="Plaquette institutionnelle (optionnel)"
          type="file"
          placeholder="Télécharger la plaquette"
          accept=".pdf"
          onFileChange={(file) => setDocuments({ ...documents, plaquette: file })}
        />
        {errors.plaquette && (
          <p className="text-sm text-[#F5E]">{errors.plaquette}</p>
        )}
      </div>

      <div className="flex items-start space-x-2 pt-4">
        <Checkbox
          id="conditions-etablissement"
          checked={formData.acceptConditions}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, acceptConditions: checked as boolean })
          }
        />
        <Label htmlFor="conditions-etablissement" className="text-sm text-gray-600 leading-relaxed">
          J'accepte les{" "}
          <a href="#" className="text-[#F43F5E] hover:underline">
            conditions spécifiques aux établissements
          </a>,{" "}
          les{" "}
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
        Créer le compte établissement
      </PrimaryButton>
    </form>
  );
}