import { type Screen, type UserType } from '../types';
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
  onNavigate: (screen: Screen) => void;
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
          <div className="p-6">
            <h1 className="text-3xl font-bold">Page non trouvée</h1>
            <p className="text-muted-foreground mt-2">
              La page demandée n'existe pas.
            </p>
          </div>
        );
    }
  };

  return <>{renderScreen()}</>;
}