//import React from 'react';
import { type Screen, type NavigateFunction, type User } from '../types';
import { DashboardScreen } from './screens/DashboardScreen';
import { EstablishmentsScreen } from './screens/EstablishmentsScreen';
import { UsersScreen } from './screens/UsersScreen';
import { SubscriptionsScreen } from './screens/SubscriptionsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

interface ScreenRendererProps {
  currentScreen: Screen;
  onNavigate: NavigateFunction;
  user: User;
}

export function ScreenRenderer({ currentScreen, onNavigate, user }: ScreenRendererProps) {
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen onNavigate={onNavigate} user={user} />;
      
      case 'establishments':
        return <EstablishmentsScreen onNavigate={onNavigate} />;
      
      case 'users':
        return <UsersScreen onNavigate={onNavigate} />;
      
      case 'subscriptions':
        return <SubscriptionsScreen onNavigate={onNavigate} />;
      
      case 'reports':
        return <ReportsScreen onNavigate={onNavigate} />;
      
      case 'settings':
        return <SettingsScreen onNavigate={onNavigate} />;
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Page non trouvée
              </h2>
              <p className="text-gray-600 mb-4">
                La page que vous recherchez n'existe pas.
              </p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderScreen()}
    </div>
  );
}
