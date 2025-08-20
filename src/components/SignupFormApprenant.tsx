import { useState } from "react";
import { InputField } from "./InputField";
import { PrimaryButton } from "./PrimaryButton";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface SignupFormApprenantProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export function SignupFormApprenant({ onSubmit, loading = false }: SignupFormApprenantProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    etablissement: "",
    acceptConditions: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
      />

      <InputField
        label="Confirmer le mot de passe"
        type="password"
        placeholder="Confirmez votre mot de passe"
        required
        value={formData.confirmPassword}
        onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
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
      </div>

      <PrimaryButton type="submit" loading={loading} className="mt-6">
        Créer mon compte
      </PrimaryButton>
    </form>
  );
}