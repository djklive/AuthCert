import { type UserType, type Screen } from '../types';

export const getNavigationItems = (userType: UserType | null) => {
  if (userType === 'establishment') {
    return [
      { screen: 'dashboard' as Screen, label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'Home' },
      { screen: 'students' as Screen, label: 'Étudiants', labelKey: 'nav.students', icon: 'Users' },
      { screen: 'formations' as Screen, label: 'Formations', labelKey: 'nav.formations', icon: 'GraduationCap' },
      { screen: 'certificates' as Screen, label: 'Certificats', labelKey: 'nav.certificates', icon: 'Award' },
      { screen: 'stats' as Screen, label: 'Statistiques', labelKey: 'nav.stats', icon: 'BarChart3' },
      { screen: 'subscription' as Screen, label: 'Abonnement', labelKey: 'nav.subscription', icon: 'Crown' },
      { screen: 'profile' as Screen, label: 'Profil', labelKey: 'nav.profile', icon: 'User' },
      { screen: 'notifications' as Screen, label: 'Notifications', labelKey: 'nav.notifications', icon: 'Bell' },
    ];
  } else {
    return [
      { screen: 'dashboard' as Screen, label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'Home' },
      { screen: 'certificates' as Screen, label: 'Mes certificats', labelKey: 'nav.certificates_student', icon: 'Award' },
      { screen: 'assistant' as Screen, label: 'Assistant IA', labelKey: 'nav.assistant', icon: 'Sparkles' },
      { screen: 'establishments' as Screen, label: 'Établissements', labelKey: 'nav.establishments', icon: 'Building2' },
      { screen: 'requests' as Screen, label: 'Demandes', labelKey: 'nav.requests', icon: 'Clock' },
      { screen: 'profile' as Screen, label: 'Profil', labelKey: 'nav.profile', icon: 'User' },
      { screen: 'notifications' as Screen, label: 'Notifications', labelKey: 'nav.notifications', icon: 'Bell' },
    ];
  }
};

export const getInitialScreen = (userType: UserType | null): Screen => {
  return userType ? 'dashboard' : 'login';
};
