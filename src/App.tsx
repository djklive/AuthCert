import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { PageDAccueil } from "./screens/PageDAccueil/PageDAccueil";
import AuthPage from "./screens/Auth/AuthPage";
import ResetPasswordPage from "./screens/Auth/ResetPasswordPage";
import { VerifierCertificat } from "./screens/VerifierCertificat";
import { Tarif } from "./screens/Tarif/Tarif";
import PaymentCallback from "./screens/Payment/PaymentCallback";
import DashboardWrapper from "./dashboard/DashboardWrapper";
import { type UserType } from "./dashboard/types";
import { AuthContext, type AuthContextType } from "./contexts/AuthContext";
import authService from "./services/authService";
import "./App.css";

// Réhydrate l'état d'authentification depuis le localStorage (session persistante)
function getInitialAuth(): { userType: UserType | null; isAuthenticated: boolean } {
  const token = authService.getToken();
  const role = authService.getUser()?.role as UserType | undefined;
  if (token && (role === "student" || role === "establishment" || role === "admin")) {
    return { userType: role, isAuthenticated: true };
  }
  return { userType: null, isAuthenticated: false };
}

export default function App() {
  const initialAuth = getInitialAuth();
  const [userType, setUserType] = useState<UserType | null>(initialAuth.userType);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);

  const login = (newUserType: UserType) => {
    setUserType(newUserType);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authService.logout();
    setUserType(null);
    setIsAuthenticated(false);
  };

  const authValue: AuthContextType = {
    userType,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <Routes>
          <Route path="/" element={<PageDAccueil />} />
          <Route path="/auth" element={<AuthPage defaultTab="login" />} />
          <Route path="/auth/signup" element={<AuthPage defaultTab="signup" />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verifier-certificat" element={<VerifierCertificat />} />
          <Route path="/tarif" element={<Tarif />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route 
            path="/dashboard/*" 
            element={
              isAuthenticated && userType ? (
                <DashboardWrapper userType={userType} isAuthenticated={isAuthenticated} />
              ) : (
                <AuthPage defaultTab="login" />
              )
            } 
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
