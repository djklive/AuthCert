import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useNavigate } from 'react-router-dom';
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
  Crown,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Screen, type UserType, type NavigateFunction } from '../types';
import { useUser } from '../hooks/useUser';
import { api } from '../../services/api';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavigationItem {
  screen: Screen;
  label: string;
  labelKey?: string;
  icon: string;
}

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: NavigateFunction;
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
  Crown,
  Sparkles
};

export function Navigation({ 
  currentScreen, 
  onNavigate, 
  onLogout, 
  navigationItems,
  userType 
}: NavigationProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Home;
  };

  // Charger le nombre de notifications non lues
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await api.getUnreadNotificationsCount();
        if (response.success) {
          setUnreadNotificationsCount(response.data.count);
        }
      } catch (err) {
        console.error('Erreur chargement notifications:', err);
      }
    };

    loadUnreadCount();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getNotificationCount = (screen: Screen) => {
    if (screen === 'notifications') return unreadNotificationsCount;
    // TODO: Ajouter des compteurs réels pour requests et students si nécessaire
    return 0;
  };

  const handleLogout = () => {
    // Appeler la fonction de déconnexion locale
    onLogout();
    // Rediriger vers la page d'accueil
    navigate('/');
  };

  const NavigationContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img src="/Logo - 32.png" alt="Logo" className="w-8 h-8 lg:w-12 lg:h-12" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base lg:text-lg">AuthCert</h1>
            <p className="text-xs text-muted-foreground truncate">
              {userType === 'establishment' ? t('nav.role_establishment') : t('nav.role_student')}
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
              className={`w-full justify-start gap-3 h-10 lg:h-11 ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              onClick={() => {
                onNavigate(item.screen);
                setIsMobileMenuOpen(false); // Fermer le menu mobile après navigation
              }}
            >
              <IconComponent className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
              <span className="flex-1 text-left truncate text-sm lg:text-base">{item.labelKey ? t(item.labelKey, item.label) : item.label}</span>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex-shrink-0">
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
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs lg:text-sm truncate">
              {user ? (
                userType === 'establishment' 
                  ? (user.nom || 'Établissement')
                  : `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur'
              ) : (
                userType === 'establishment' ? 'École Supérieure' : 'Jean Dupont'
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {userType === 'establishment' 
                ? (user?.statut === 'ACTIF' ? t('nav.establishment_certified') : t('nav.status_label', { status: user?.statut || 'EN_ATTENTE' }))
                : t('nav.student_active')
              }
            </p>
          </div>
        </div>

        <LanguageSwitcher />

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 lg:h-11 text-muted-foreground hover:text-foreground text-sm lg:text-base"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
          <span className="truncate">{t('nav.logout')}</span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobileMenu}
          className="p-2 bg-background shadow-lg border-border"
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={toggleMobileMenu} />
      )}

      {/* Mobile Navigation Sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavigationContent />
      </div>

      {/* Desktop Navigation */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col">
        <NavigationContent />
      </aside>
    </>
  );
}