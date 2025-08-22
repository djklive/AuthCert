export type UserType = 'student' | 'establishment';

export type Screen = 
  | 'login' 
  | 'onboarding' 
  | 'dashboard' 
  | 'certificates' 
  | 'create-certificate'
  | 'establishments' 
  | 'students'
  | 'stats'
  | 'subscription'
  | 'requests' 
  | 'profile' 
  | 'notifications';

export type AppState = {
  currentScreen: Screen;
  userType: UserType | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
};