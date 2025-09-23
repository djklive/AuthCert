import { type UserType, type Screen } from '../types';

export const getNavigationItems = (userType: UserType | null) => {
  if (userType === 'establishment') {
    return [
      { screen: 'dashboard' as Screen, label: 'Dashboard', icon: 'Home' },
      { screen: 'students' as Screen, label: 'Étudiants', icon: 'Users' },
      { screen: 'formations' as Screen, label: 'Formations', icon: 'GraduationCap' },
      { screen: 'certificates' as Screen, label: 'Certificats', icon: 'Award' },
      { screen: 'stats' as Screen, label: 'Statistiques', icon: 'BarChart3' },
      { screen: 'subscription' as Screen, label: 'Abonnement', icon: 'Crown' },
      { screen: 'profile' as Screen, label: 'Profil', icon: 'User' },
      { screen: 'notifications' as Screen, label: 'Notifications', icon: 'Bell' },
    ];
  } else {
    return [
      { screen: 'dashboard' as Screen, label: 'Dashboard', icon: 'Home' },
      { screen: 'certificates' as Screen, label: 'Mes certificats', icon: 'Award' },
      { screen: 'establishments' as Screen, label: 'Établissements', icon: 'Building2' },
      { screen: 'requests' as Screen, label: 'Demandes', icon: 'Clock' },
      { screen: 'profile' as Screen, label: 'Profil', icon: 'User' },
      { screen: 'notifications' as Screen, label: 'Notifications', icon: 'Bell' },
    ];
  }
};

export const getInitialScreen = (userType: UserType | null): Screen => {
  return userType ? 'dashboard' : 'login';
};