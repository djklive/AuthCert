import { useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

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

interface SignupFormEtablissementProps {
  onSubmit: (data: SignupFormEtablissementSubmit) => void;
  loading?: boolean;
}

export function SignupFormEtablissement({ onSubmit, loading = false }: SignupFormEtablissementProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, documents });
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

        <InputField
          label="Autorisation de fonctionnement"
          type="file"
          placeholder="Télécharger l'autorisation"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onFileChange={(file) => setDocuments({ ...documents, autorisation: file })}
        />

        <InputField
          label="Pièce d'identité du représentant"
          type="file"
          placeholder="Télécharger la pièce d'identité"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onFileChange={(file) => setDocuments({ ...documents, pieceIdentite: file })}
        />

        <InputField
          label="Logo de l'établissement (optionnel)"
          type="file"
          placeholder="Télécharger le logo"
          accept=".jpg,.jpeg,.png,.svg"
          onFileChange={(file) => setDocuments({ ...documents, logo: file })}
        />

        <InputField
          label="Plaquette institutionnelle (optionnel)"
          type="file"
          placeholder="Télécharger la plaquette"
          accept=".pdf"
          onFileChange={(file) => setDocuments({ ...documents, plaquette: file })}
        />
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
      </div>

      <PrimaryButton type="submit" loading={loading} className="mt-6">
        Créer le compte établissement
      </PrimaryButton>
    </form>
  );
}