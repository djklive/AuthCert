import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { ScreenRenderer } from './components/ScreenRenderer';
import { type UserType, type Screen, type AppState } from './types';
import { getNavigationItems, getInitialScreen } from './utils/navigation';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'login',
    userType: null,
    isAuthenticated: false,
    hasCompletedOnboarding: false
  });

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

  const handleNavigate = (screen: Screen) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: screen
    }));
  };

  const handleLogout = () => {
    setAppState({
      currentScreen: 'login',
      userType: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false
    });
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
          <main className="flex-1 overflow-auto">
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