import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PageDAccueil } from "./screens/PageDAccueil/PageDAccueil";
import AuthPage from "./screens/Auth/AuthPage";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PageDAccueil />} />
        <Route path="/auth" element={<AuthPage defaultTab="login" />} />
        <Route path="/auth/signup" element={<AuthPage defaultTab="signup" />} />
      </Routes>
    </Router>
  );
}
