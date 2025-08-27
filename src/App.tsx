import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { PageDAccueil } from "./screens/PageDAccueil/PageDAccueil";
import AuthPage from "./screens/Auth/AuthPage";
import { VerifierCertificat } from "./screens/VerifierCertificat";
import { Tarif } from "./screens/Tarif/Tarif";
import DashboardWrapper from "./dashboard/DashboardWrapper";
import { type UserType } from "./dashboard/types";
import { AuthContext, type AuthContextType } from "./contexts/AuthContext";
import "./App.css";

export default function App() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (newUserType: UserType) => {
    setUserType(newUserType);
    setIsAuthenticated(true);
  };

  const logout = () => {
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
          <Route path="/verifier-certificat" element={<VerifierCertificat />} />
          <Route path="/tarif" element={<Tarif />} />
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
