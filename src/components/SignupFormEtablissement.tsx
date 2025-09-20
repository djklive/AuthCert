import { useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileUploadService } from "../services/fileUploadService";
import { API_BASE } from "../services/api";

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

export interface EtablissementDocuments {
  // Documents communs
  cniRepresentant: File | null;
  logo: File | null;
  plaquette: File | null;
  
  // Documents pour établissements d'enseignement
  arreteCreation: File | null;
  autorisationExercer: File | null;
  lettreNomination: File | null;
  
  // Documents pour centres de formation professionnelle
  rccmDocument: File | null;
  niu: File | null;
  agrementMinefop: File | null;
  pouvoirRepresentant: File | null;
  
  // Documents pour entreprises
  carteContribuable: File | null;
  pouvoirDg: File | null;
}

export interface EtablissementFormValues {
  nomEtablissement: string;
  emailInstitutionnel: string;
  password: string;
  typeOrganisation: 'ETABLISSEMENT_ENSEIGNEMENT' | 'CENTRE_FORMATION_PROFESSIONNELLE' | 'ENTREPRISE';
  rccm: string;
  typeEtablissement: string;
  adresse: string;
  telephone: string;
  nomRepresentant: string;
  emailRepresentant: string;
  telephoneRepresentant: string;
  acceptConditions: boolean;
  
  // Champs spécifiques selon le type d'organisation
  niu: string;
  numeroAgrement: string;
  arreteCreation: string;
  ministereTutelle: string;
}

export type SignupFormEtablissementSubmit = EtablissementFormValues & { documents: EtablissementDocuments };

export function SignupFormEtablissement() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EtablissementFormValues>({
    nomEtablissement: "",
    emailInstitutionnel: "",
    password: "",
    typeOrganisation: 'ETABLISSEMENT_ENSEIGNEMENT',
    rccm: "",
    typeEtablissement: "",
    adresse: "",
    telephone: "",
    nomRepresentant: "",
    emailRepresentant: "",
    telephoneRepresentant: "",
    acceptConditions: false,
    niu: "",
    numeroAgrement: "",
    arreteCreation: "",
    ministereTutelle: ""
  });

  const [documents, setDocuments] = useState<EtablissementDocuments>({
    // Documents communs
    cniRepresentant: null,
    logo: null,
    plaquette: null,
    
    // Documents pour établissements d'enseignement
    arreteCreation: null,
    autorisationExercer: null,
    lettreNomination: null,
    
    // Documents pour centres de formation professionnelle
    rccmDocument: null,
    niu: null,
    agrementMinefop: null,
    pouvoirRepresentant: null,
    
    // Documents pour entreprises
    carteContribuable: null,
    pouvoirDg: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  // Fonction pour obtenir les documents requis selon le type d'organisation
  const getRequiredDocuments = (typeOrganisation: string) => {
    switch (typeOrganisation) {
      case 'ETABLISSEMENT_ENSEIGNEMENT':
        return {
          required: ['arreteCreation', 'autorisationExercer', 'cniRepresentant'],
          optional: ['lettreNomination', 'logo', 'plaquette']
        };
      case 'CENTRE_FORMATION_PROFESSIONNELLE':
        return {
          required: ['rccmDocument', 'niu', 'agrementMinefop', 'cniRepresentant'],
          optional: ['pouvoirRepresentant', 'logo', 'plaquette']
        };
      case 'ENTREPRISE':
        return {
          required: ['rccmDocument', 'carteContribuable', 'cniRepresentant'],
          optional: ['pouvoirDg', 'logo', 'plaquette']
        };
      default:
        return { required: [], optional: [] };
    }
  };

  // Fonction pour obtenir les champs requis selon le type d'organisation
  const getRequiredFields = (typeOrganisation: string) => {
    switch (typeOrganisation) {
      case 'ETABLISSEMENT_ENSEIGNEMENT':
        return ['arreteCreation', 'ministereTutelle'];
      case 'CENTRE_FORMATION_PROFESSIONNELLE':
        return ['niu', 'numeroAgrement'];
      case 'ENTREPRISE':
        return ['rccm'];
      default:
        return [];
    }
  };

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
    
    // Validation des champs spécifiques selon le type d'organisation
    const requiredFields = getRequiredFields(formData.typeOrganisation);
    requiredFields.forEach(field => {
      if (!formData[field as keyof EtablissementFormValues]) {
        newErrors[field] = `Le champ ${field} est requis pour ce type d'organisation`;
      }
    });
    
    // Validation des documents requis selon le type d'organisation
    const requiredDocs = getRequiredDocuments(formData.typeOrganisation).required;
    requiredDocs.forEach(doc => {
      if (!documents[doc as keyof EtablissementDocuments]) {
        newErrors[doc] = `Le document ${doc} est requis pour ce type d'organisation`;
      }
    });
    
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
      // 1. Upload des fichiers vers Supabase
      const uploadPromises: Promise<void>[] = [];
      const uploadedFiles: Record<string, string> = {};

      // Fonction helper pour uploader un fichier
      const uploadFile = (file: File, fieldName: string) => {
        const path = `etablissements/${Date.now()}_${fieldName}.${file.name.split('.').pop()}`;
        return FileUploadService.uploadFile(file, 'documents', path)
          .then(result => {
            if (result.success && result.publicUrl) {
              uploadedFiles[fieldName] = result.publicUrl;
            } else {
              throw new Error(`Erreur upload ${fieldName}: ${result.error}`);
            }
          });
      };

      // Uploader tous les fichiers non-null
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          uploadPromises.push(uploadFile(file, key));
        }
      });

      // Attendre que tous les uploads soient terminés
      await Promise.all(uploadPromises);

      // 2. Créer l'établissement avec les URLs des fichiers Supabase
      const response = await axios.post(`${API_BASE}/register/etablissement/supabase`, {
        nomEtablissement: formData.nomEtablissement,
        emailEtablissement: formData.emailInstitutionnel,
        motDePasseEtablissement: formData.password,
        typeOrganisation: formData.typeOrganisation,
        rccmEtablissement: formData.rccm,
        typeEtablissement: formData.typeEtablissement,
        adresseEtablissement: formData.adresse,
        telephoneEtablissement: formData.telephone,
        nomResponsableEtablissement: formData.nomRepresentant,
        emailResponsableEtablissement: formData.emailRepresentant,
        telephoneResponsableEtablissement: formData.telephoneRepresentant,
        // Champs spécifiques selon le type d'organisation
        niu: formData.niu,
        numeroAgrement: formData.numeroAgrement,
        arreteCreation: formData.arreteCreation,
        ministereTutelle: formData.ministereTutelle,
        // URLs des fichiers uploadés vers Supabase
        documents: uploadedFiles
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
      
      {/* Sélection du type d'organisation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Type d'organisation</h3>
        
        <div className="space-y-2">
          <Label className="text-gray-700">Type d'organisation <span className="text-[#F43F5E]">*</span></Label>
          <Select 
            value={formData.typeOrganisation} 
            onValueChange={(value) => setFormData({ ...formData, typeOrganisation: value as 'ETABLISSEMENT_ENSEIGNEMENT' | 'CENTRE_FORMATION_PROFESSIONNELLE' | 'ENTREPRISE' })}
          >
            <SelectTrigger className="h-12 border-2 focus:border-[#F43F5E]">
              <SelectValue placeholder="Sélectionnez votre type d'organisation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ETABLISSEMENT_ENSEIGNEMENT">
                <div className="flex flex-col">
                  <span className="font-medium">Établissement d'Enseignement</span>
                  <span className="text-xs text-gray-500">Universités, Instituts, Écoles (MINESUP, MINESEC, MINEDUB)</span>
                </div>
              </SelectItem>
              <SelectItem value="CENTRE_FORMATION_PROFESSIONNELLE">
                <div className="flex flex-col">
                  <span className="font-medium">Centre de Formation Professionnelle</span>
                  <span className="text-xs text-gray-500">Centres de formation, organismes de certification (MINEFOP)</span>
                </div>
              </SelectItem>
              <SelectItem value="ENTREPRISE">
                <div className="flex flex-col">
                  <span className="font-medium">Entreprise</span>
                  <span className="text-xs text-gray-500">Entreprises pour certifications internes</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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

        {/* Champs conditionnels selon le type d'organisation */}
        {formData.typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE' && (
          <InputField
            label="Numéro RCCM"
            type="text"
            placeholder="CD/KIN/RCCM/XX-X-XXXXX"
            required
            value={formData.rccm}
            onChange={(value) => setFormData({ ...formData, rccm: value })}
            error={errors.rccm}
          />
        )}

        {formData.typeOrganisation === 'ENTREPRISE' && (
          <InputField
            label="Numéro RCCM"
            type="text"
            placeholder="CD/KIN/RCCM/XX-X-XXXXX"
            required
            value={formData.rccm}
            onChange={(value) => setFormData({ ...formData, rccm: value })}
            error={errors.rccm}
          />
        )}

        {/* Champs spécifiques pour établissements d'enseignement */}
        {formData.typeOrganisation === 'ETABLISSEMENT_ENSEIGNEMENT' && (
          <>
            <InputField
              label="Référence Arrêté de Création"
              type="text"
              placeholder="Ex: Arrêté N° 123/MINESUP du 15/01/2020"
              required
              value={formData.arreteCreation}
              onChange={(value) => setFormData({ ...formData, arreteCreation: value })}
              error={errors.arreteCreation}
            />
            <InputField
              label="Ministère de Tutelle"
              type="text"
              placeholder="Ex: MINESUP, MINESEC, MINEDUB"
              required
              value={formData.ministereTutelle}
              onChange={(value) => setFormData({ ...formData, ministereTutelle: value })}
              error={errors.ministereTutelle}
            />
          </>
        )}

        {/* Champs spécifiques pour centres de formation professionnelle */}
        {formData.typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE' && (
          <>
            <InputField
              label="Numéro d'Identifiant Unique (NIU)"
              type="text"
              placeholder="Ex: M123456789012345"
              required
              value={formData.niu}
              onChange={(value) => setFormData({ ...formData, niu: value })}
              error={errors.niu}
            />
            <InputField
              label="Numéro d'Agrément MINEFOP"
              type="text"
              placeholder="Ex: AGREMENT/MINEFOP/2024/001"
              required
              value={formData.numeroAgrement}
              onChange={(value) => setFormData({ ...formData, numeroAgrement: value })}
              error={errors.numeroAgrement}
            />
          </>
        )}

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
        
        {/* Documents pour établissements d'enseignement */}
        {formData.typeOrganisation === 'ETABLISSEMENT_ENSEIGNEMENT' && (
          <>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <h4 className="font-semibold mb-2 text-[#F43F5E]">Documents requis pour les établissements d'enseignement</h4>
              <p className="text-sm text-[#F43F5E]">
                Ces documents sont nécessaires pour vérifier la légitimité de votre établissement auprès des ministères de tutelle.
              </p>
            </div>
            
            <InputField
              label="Arrêté de Création"
              type="file"
              placeholder="Télécharger l'arrêté de création"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, arreteCreation: file })}
            />
            {errors.arreteCreation && (
              <p className="text-sm text-[#F43F5E]">{errors.arreteCreation}</p>
            )}

            <InputField
              label="Autorisation d'Exercer"
              type="file"
              placeholder="Télécharger l'autorisation d'exercer"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, autorisationExercer: file })}
            />
            {errors.autorisationExercer && (
              <p className="text-sm text-[#F43F5E]">{errors.autorisationExercer}</p>
            )}

            <InputField
              label="CNI du Chef d'Établissement"
              type="file"
              placeholder="Télécharger la CNI du représentant légal"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, cniRepresentant: file })}
            />
            {errors.cniRepresentant && (
              <p className="text-sm text-[#F43F5E]">{errors.cniRepresentant}</p>
            )}

            <InputField
              label="Lettre de Nomination (recommandé)"
              type="file"
              placeholder="Télécharger la lettre de nomination"
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, lettreNomination: file })}
            />
            {errors.lettreNomination && (
              <p className="text-sm text-[#F43F5E]">{errors.lettreNomination}</p>
            )}
          </>
        )}

        {/* Documents pour centres de formation professionnelle */}
        {formData.typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE' && (
          <>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <h4 className="font-semibold mb-2 text-[#F43F5E]">Documents requis pour les centres de formation professionnelle</h4>
              <p className="text-sm text-[#F43F5E]">
                Ces documents sont nécessaires pour vérifier votre agrément auprès du MINEFOP.
              </p>
            </div>
            
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
              label="Carte NIU (Numéro d'Identifiant Unique)"
              type="file"
              placeholder="Télécharger la carte NIU"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, niu: file })}
            />
            {errors.niu && (
              <p className="text-sm text-[#F43F5E]">{errors.niu}</p>
            )}

            <InputField
              label="Agrément MINEFOP"
              type="file"
              placeholder="Télécharger l'agrément MINEFOP"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, agrementMinefop: file })}
            />
            {errors.agrementMinefop && (
              <p className="text-sm text-[#F43F5E]">{errors.agrementMinefop}</p>
            )}

            <InputField
              label="CNI du Gérant/Directeur"
              type="file"
              placeholder="Télécharger la CNI du représentant légal"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, cniRepresentant: file })}
            />
            {errors.cniRepresentant && (
              <p className="text-sm text-[#F43F5E]">{errors.cniRepresentant}</p>
            )}

            <InputField
              label="Pouvoir du Représentant (recommandé)"
              type="file"
              placeholder="Télécharger le pouvoir"
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, pouvoirRepresentant: file })}
            />
            {errors.pouvoirRepresentant && (
              <p className="text-sm text-[#F43F5E]">{errors.pouvoirRepresentant}</p>
            )}
          </>
        )}

        {/* Documents pour entreprises */}
        {formData.typeOrganisation === 'ENTREPRISE' && (
          <>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <h4 className="font-semibold mb-2 text-[#F43F5E]">Documents requis pour les entreprises</h4>
              <p className="text-sm text-[#F43F5E]">
                Ces documents sont nécessaires pour vérifier l'existence légale de votre entreprise.
              </p>
            </div>
            
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
              label="Carte de Contribuable"
              type="file"
              placeholder="Télécharger la carte de contribuable"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, carteContribuable: file })}
            />
            {errors.carteContribuable && (
              <p className="text-sm text-[#F43F5E]">{errors.carteContribuable}</p>
            )}

            <InputField
              label="CNI du DG ou DRH"
              type="file"
              placeholder="Télécharger la CNI du responsable"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, cniRepresentant: file })}
            />
            {errors.cniRepresentant && (
              <p className="text-sm text-[#F43F5E]">{errors.cniRepresentant}</p>
            )}

            <InputField
              label="Pouvoir du DG (recommandé)"
              type="file"
              placeholder="Télécharger le pouvoir du DG"
              accept=".pdf,.jpg,.jpeg,.png"
              onFileChange={(file) => setDocuments({ ...documents, pouvoirDg: file })}
            />
            {errors.pouvoirDg && (
              <p className="text-sm text-[#F43F5E]">{errors.pouvoirDg}</p>
            )}
          </>
        )}

        {/* Documents optionnels communs */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-semibold mb-3 text-gray-700">Documents optionnels</h4>
          
          <InputField
            label="Logo de l'établissement"
            type="file"
            placeholder="Télécharger le logo"
            accept=".jpg,.jpeg,.png,.svg"
            onFileChange={(file) => setDocuments({ ...documents, logo: file })}
          />
          {errors.logo && (
            <p className="text-sm text-[#F43F5E]">{errors.logo}</p>
          )}

          <InputField
            label="Plaquette institutionnelle"
            type="file"
            placeholder="Télécharger la plaquette"
            accept=".pdf"
            onFileChange={(file) => setDocuments({ ...documents, plaquette: file })}
          />
          {errors.plaquette && (
            <p className="text-sm text-[#F43F5E]">{errors.plaquette}</p>
          )}
        </div>
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