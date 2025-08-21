import { Button } from "./ui/button";
import { type ReactNode } from "react";

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className = ""
}: PrimaryButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full h-12 bg-[#F43F5E] hover:bg-[#E11D48] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded-xl ${className}`}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Chargement...
        </div>
      ) : children}
    </Button>
  );
}