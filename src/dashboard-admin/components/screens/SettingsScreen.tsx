//import React from 'react';
import { Shield, Bell, Globe } from 'lucide-react';
//import { type NavigateFunction } from '../../types';

/*interface SettingsScreenProps {
  onNavigate: NavigateFunction;
}*/

export function SettingsScreen() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Configurez votre plateforme d'administration</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Authentification à deux facteurs
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Historique des connexions
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Permissions utilisateur
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Alertes par email
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Notifications push
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Rapports automatiques
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-semibold text-gray-900">Général</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Langue et région
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Thème d'interface
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left">
              Sauvegarde des données
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
