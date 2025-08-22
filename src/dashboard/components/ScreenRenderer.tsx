import { type Screen, type UserType, type NavigateFunction } from '../types';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { EstablishmentOnboardingScreen } from './screens/EstablishmentOnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { EstablishmentDashboardScreen } from './screens/EstablishmentDashboardScreen';
import { CertificatesScreen } from './screens/CertificatesScreen';
import { CreateCertificateScreen } from './screens/CreateCertificateScreen';
import { EstablishmentsScreen } from './screens/EstablishmentsScreen';
import { StudentsManagementScreen } from './screens/StudentsManagementScreen';
import { EstablishmentStatsScreen } from './screens/EstablishmentStatsScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';

interface ScreenRendererProps {
  currentScreen: Screen;
  userType: UserType | null;
  onNavigate: NavigateFunction;
  onLogin: (userType: UserType) => void;
  onStartOnboarding: (userType: UserType) => void;
  onCompleteOnboarding: () => void;
}

export function ScreenRenderer({
  currentScreen,
  userType,
  onNavigate,
  onLogin,
  onStartOnboarding,
  onCompleteOnboarding
}: ScreenRendererProps) {
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen 
            onLogin={onLogin} 
            onStartOnboarding={onStartOnboarding} 
          />
        );

      case 'onboarding':
        if (userType === 'establishment') {
          return (
            <EstablishmentOnboardingScreen 
              onComplete={onCompleteOnboarding} 
            />
          );
        } else {
          return (
            <OnboardingScreen 
              onComplete={onCompleteOnboarding} 
            />
          );
        }

      case 'dashboard':
        if (userType === 'establishment') {
          return (
            <EstablishmentDashboardScreen 
              onNavigate={onNavigate}
              hasData={true}
            />
          );
        } else {
          return (
            <DashboardScreen 
              onNavigate={onNavigate}
            />
          );
        }

      case 'certificates':
        return (
          <CertificatesScreen 
            onNavigate={onNavigate}
          />
        );

      case 'create-certificate':
        return (
          <CreateCertificateScreen 
            onNavigate={onNavigate}
          />
        );

      case 'establishments':
        return (
          <EstablishmentsScreen 
            onNavigate={onNavigate}
          />
        );

      case 'students':
        return (
          <StudentsManagementScreen 
            onNavigate={onNavigate}
          />
        );

      case 'stats':
        return (
          <EstablishmentStatsScreen 
            onNavigate={onNavigate}
          />
        );

      case 'subscription':
        return (
          <SubscriptionScreen 
            onNavigate={onNavigate}
          />
        );

      case 'requests':
        return (
          <RequestsScreen 
            onNavigate={onNavigate}
          />
        );

      case 'profile':
        return (
          <ProfileScreen 
            onNavigate={onNavigate}
          />
        );

      case 'notifications':
        return (
          <NotificationsScreen 
            onNavigate={onNavigate}
          />
        );

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
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderScreen()}
    </div>
  );
}