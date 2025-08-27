//import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield
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

  const handleLogout = () => {
    onLogout();
    navigate('/');
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

  return (
    <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
            {/* <Shield className="w-6 h-6 text-white" /> */}
            <img src="/Logo - 32.png" alt="logo" className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AuthCert</h1>
            <p className="text-sm text-gray-500">Administration</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
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
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-rose-600' : 'text-gray-500'}`} />
              <span className="flex-1">{item.label}</span>
              
              {item.badge && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
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
          <LogOut className="w-5 h-5 text-gray-500" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </nav>
  );
}
