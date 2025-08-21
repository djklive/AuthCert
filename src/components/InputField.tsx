import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { EyeIcon, EyeOffIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface InputFieldProps {
  label: string;
  type?: "text" | "email" | "password" | "tel" | "file";
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  error?: string;
  accept?: string;
  className?: string;
}

export function InputField({
  label,
  type = "text",
  placeholder,
  required = false,
  value = "",
  onChange,
  onFileChange,
  error,
  accept,
  className = ""
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputId = `file-${label.replace(/[^a-z0-9_-]/gi, "-")}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "file") {
      const file = e.target.files?.[0] || null;
      setFileName(file ? file.name : "");
      onFileChange?.(file);
    } else {
      onChange?.(e.target.value);
    }
  };

  if (type === "file") {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label htmlFor={inputId} className="text-gray-700">{label} {required && <span className="text-[#F43F5E]">*</span>}</Label>
        <div className="relative">
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            aria-label={label}
            title={label}
            name={inputId}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(inputId)?.click()}
            className="w-full justify-start h-12 border-2 hover:border-[#F43F5E] transition-colors"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            {fileName || placeholder || "Choisir un fichier"}
          </Button>
        </div>
        {error && <p className="text-sm text-[#F43F5E]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-gray-700">{label} {required && <span className="text-[#F43F5E]">*</span>}</Label>
      <div className="relative">
        <Input
          type={type === "password" && showPassword ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className="h-12 border-2 focus:border-[#F43F5E] transition-colors"
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-[#F43F5E]"
          >
            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-[#F43F5E]">{error}</p>}
    </div>
  );
}