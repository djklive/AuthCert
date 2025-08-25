import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ScreenRenderer } from './components/ScreenRenderer';
import { type Screen, type UserType } from './types';
import './styles/globals.css';

interface AppProps {
  onLogout?: () => void;
}

export default function App({ onLogout }: AppProps) {
  const [searchParams] = useSearchParams();
  const [appState, setAppState] = useState({
    currentScreen: 'dashboard' as Screen,
    userType: searchParams.get('userType') as UserType || 'admin',
    isAuthenticated: true,
    user: {
      name: 'Administrateur',
      email: 'admin@authcert.com',
      role: 'admin'
    }
  });

  useEffect(() => {
    // Initialiser l'état avec les paramètres de l'URL
    const userType = searchParams.get('userType') as UserType;
    if (userType && userType !== appState.userType) {
      setAppState(prev => ({
        ...prev,
        userType
      }));
    }
  }, [searchParams, appState.userType]);

  const handleNavigate: (screen: Screen | string) => void = (screen) => {
    // Vérifier si c'est un Screen valide
    const validScreens: Screen[] = [
      'dashboard', 'establishments', 'users', 'subscriptions', 'reports', 'settings'
    ];

    if (typeof screen === 'string' && validScreens.includes(screen as Screen)) {
      setAppState(prev => ({
        ...prev,
        currentScreen: screen as Screen
      }));
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      setAppState(prev => ({
        ...prev,
        isAuthenticated: false
      }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation
        currentScreen={appState.currentScreen}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={appState.user}
      />
      
      <main className="flex-1 overflow-auto">
        <ScreenRenderer
          currentScreen={appState.currentScreen}
          onNavigate={handleNavigate}
          user={appState.user}
        />
      </main>
    </div>
  );
}
