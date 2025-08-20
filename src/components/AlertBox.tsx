import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircleIcon, XCircleIcon, InfoIcon } from "lucide-react";

interface AlertBoxProps {
  type: "success" | "error" | "info";
  message: string;
  className?: string;
}

export function AlertBox({ type, message, className = "" }: AlertBoxProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "error":
        return <XCircleIcon className="w-4 h-4" />;
      case "info":
        return <InfoIcon className="w-4 h-4" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 text-green-800";
      case "error":
        return "border-red-200 bg-red-50 text-red-800";
      case "info":
        return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  return (
    <Alert className={`${getColors()} rounded-xl ${className}`}>
      {getIcon()}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}