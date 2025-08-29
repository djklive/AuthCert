//import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { type Screen, type NavigateFunction, type User } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: NavigateFunction;
  onLogout: () => void;
  user: User;
}

export function Navigation({ currentScreen, onNavigate, onLogout, user }: NavigationProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'establishments',
      label: 'Établissements',
      icon: Building2,
      badge: { count: 3, type: 'warning' }
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: Users,
      badge: null
    },
    {
      id: 'subscriptions',
      label: 'Abonnements',
      icon: CreditCard,
      badge: { count: 1, type: 'error' }
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      badge: null
    }
  ];

  const NavigationContent = () => (
    <>
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/Logo - 32.png" alt="logo" className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">AuthCert</h1>
            <p className="text-xs lg:text-sm text-gray-500 truncate">Administration</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileMenuOpen(false); // Fermer le menu mobile après navigation
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 ${isActive ? 'text-rose-600' : 'text-gray-500'}`} />
              <span className="flex-1 truncate">{item.label}</span>
              
              {item.badge && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  item.badge.type === 'warning' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {item.badge.count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          <span className="truncate">Se déconnecter</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-gray-600" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={toggleMobileMenu} />
      )}

      {/* Mobile Navigation Sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavigationContent />
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col">
        <NavigationContent />
      </nav>
    </>
  );
}
