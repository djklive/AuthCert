import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Home, 
  Award, 
  Building2, 
  Clock, 
  User, 
  Bell, 
  LogOut,
  Users,
  BarChart3,
  Crown
} from 'lucide-react';
import { type Screen, type UserType } from '../types';

interface NavigationItem {
  screen: Screen;
  label: string;
  icon: string;
}

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  navigationItems: NavigationItem[];
  userType: UserType | null;
}

const iconMap = {
  Home,
  Award,
  Building2,
  Clock,
  User,
  Bell,
  Users,
  BarChart3,
  Crown
};

export function Navigation({ 
  currentScreen, 
  onNavigate, 
  onLogout, 
  navigationItems,
  userType 
}: NavigationProps) {
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Home;
  };

  const getNotificationCount = (screen: Screen) => {
    if (screen === 'notifications') return 3;
    if (screen === 'requests' && userType === 'student') return 2;
    if (screen === 'students' && userType === 'establishment') return 7;
    return 0;
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">CertifiED</h1>
            <p className="text-xs text-muted-foreground">
              {userType === 'establishment' ? 'Établissement' : 'Apprenant'}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const IconComponent = getIconComponent(item.icon);
          const isActive = currentScreen === item.screen;
          const notificationCount = getNotificationCount(item.screen);

          return (
            <Button
              key={item.screen}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start gap-3 h-11 ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              onClick={() => onNavigate(item.screen)}
            >
              <IconComponent className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {notificationCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      <Separator />

      {/* User Profile & Logout */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {userType === 'establishment' ? 'École Supérieure' : 'Jean Dupont'}
            </p>
            <p className="text-xs text-muted-foreground">
              {userType === 'establishment' ? 'Établissement certifié' : 'Étudiant actif'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  );
}