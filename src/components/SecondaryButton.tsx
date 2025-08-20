import { Button } from "./ui/button";
import { ReactNode } from "react";

interface SecondaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = ""
}: SecondaryButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className={`w-full h-12 border-2 border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded-xl ${className}`}
    >
      {children}
    </Button>
  );
}