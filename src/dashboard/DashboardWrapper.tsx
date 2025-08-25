import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import App from './App';
import AdminApp from '../dashboard-admin/App';
import { type UserType } from './types';
import { useAuth } from '../App';
import './styles/globals.css';

interface DashboardWrapperProps {
  userType: UserType;
  isAuthenticated: boolean;
}

export default function DashboardWrapper({ userType, isAuthenticated }: DashboardWrapperProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    // Mettre à jour l'URL avec le type d'utilisateur pour le dashboard
    if (searchParams.get('userType') !== userType) {
      navigate(`/dashboard?userType=${userType}`, { replace: true });
    }

    // Marquer comme prêt après un court délai pour permettre la navigation
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [userType, isAuthenticated, navigate, searchParams]);

  // Fonction de déconnexion qui utilise le contexte global
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated || !isReady) {
    return null;
  }

  if (userType === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }
  return <App onLogout={handleLogout} />;
}
