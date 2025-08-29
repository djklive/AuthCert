import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ScreenRenderer } from './components/ScreenRenderer';
import { type UserType, type Screen, type AppState, type NavigateFunction } from './types';
import { getNavigationItems, getInitialScreen } from './utils/navigation';
import authService from '../services/authService';

interface AppProps {
  onLogout?: () => void;
}

export default function App({ onLogout }: AppProps) {
  const [searchParams] = useSearchParams();
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'login',
    userType: null,
    isAuthenticated: false,
    hasCompletedOnboarding: true
  });

  // Initialiser automatiquement avec le type d'utilisateur depuis l'URL
  useEffect(() => {
    const userTypeFromUrl = searchParams.get('userType') as UserType;
    if (userTypeFromUrl && userTypeFromUrl !== appState.userType) {
      setAppState({
        currentScreen: getInitialScreen(userTypeFromUrl),
        userType: userTypeFromUrl,
        isAuthenticated: true,
        hasCompletedOnboarding: true
      });
    }
  }, [searchParams, appState.userType]);

  const handleLogin = (userType: UserType) => {
    setAppState({
      currentScreen: getInitialScreen(userType),
      userType,
      isAuthenticated: true,
      hasCompletedOnboarding: true
    });
  };

  const handleStartOnboarding = (userType: UserType) => {
    setAppState({
      currentScreen: 'onboarding',
      userType,
      isAuthenticated: true,
      hasCompletedOnboarding: false
    });
  };

  const handleCompleteOnboarding = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: getInitialScreen(prev.userType),
      hasCompletedOnboarding: true
    }));
  };

  const handleNavigate: NavigateFunction = (screen) => {
    // Vérifier si c'est un Screen valide
    const validScreens: Screen[] = [
      'login', 'onboarding', 'dashboard', 'certificates', 'create-certificate',
      'establishments', 'students', 'stats', 'subscription', 'requests', 'profile', 'notifications'
    ];
    
    if (typeof screen === 'string' && validScreens.includes(screen as Screen)) {
      setAppState(prev => ({
        ...prev,
        currentScreen: screen as Screen
      }));
    }
  };

  const handleLogout = () => {
    // Déconnexion du service d'authentification (supprime le token JWT)
    authService.logout();
    
    // Utiliser la fonction de déconnexion passée en prop si disponible
    if (onLogout) {
      onLogout();
    } else {
      // Fallback local
      setAppState({
        currentScreen: 'login',
        userType: null,
        isAuthenticated: false,
        hasCompletedOnboarding: false
      });
    }
  };

  const showNavigation = appState.isAuthenticated && 
                        appState.hasCompletedOnboarding && 
                        appState.currentScreen !== 'login' && 
                        appState.currentScreen !== 'onboarding';

  return (
    <div className="min-h-screen bg-background">
      {showNavigation ? (
        <div className="flex h-screen">
          <Navigation
            currentScreen={appState.currentScreen}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            navigationItems={getNavigationItems(appState.userType)}
            userType={appState.userType}
          />
          <main className="flex-1 overflow-auto lg:ml-0">
            <ScreenRenderer
              currentScreen={appState.currentScreen}
              userType={appState.userType}
              onNavigate={handleNavigate}
              onLogin={handleLogin}
              onStartOnboarding={handleStartOnboarding}
              onCompleteOnboarding={handleCompleteOnboarding}
            />
          </main>
        </div>
      ) : (
        <ScreenRenderer
          currentScreen={appState.currentScreen}
          userType={appState.userType}
          onNavigate={handleNavigate}
          onLogin={handleLogin}
          onStartOnboarding={handleStartOnboarding}
          onCompleteOnboarding={handleCompleteOnboarding}
        />
      )}
    </div>
  );
}