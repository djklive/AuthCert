export type UserType = 'student' | 'establishment' | 'admin';

export type Screen = 
  | 'login' 
  | 'onboarding' 
  | 'dashboard' 
  | 'certificates' 
  | 'create-certificate'
  | 'formations'
  | 'establishments' 
  | 'students'
  | 'stats'
  | 'subscription'
  | 'requests' 
  | 'profile' 
  | 'notifications';

// Type pour la navigation qui accepte soit Screen soit string
export type NavigateFunction = (screen: Screen | string) => void;

export type AppState = {
  currentScreen: Screen;
  userType: UserType | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
};