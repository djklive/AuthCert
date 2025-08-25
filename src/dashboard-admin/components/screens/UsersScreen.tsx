import React from 'react';
import { Users, Search, Filter } from 'lucide-react';
import { type NavigateFunction } from '../../types';

interface UsersScreenProps {
  onNavigate: NavigateFunction;
}

export function UsersScreen({ onNavigate }: UsersScreenProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Gérez tous les utilisateurs de la plateforme</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>
        
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interface en cours de développement</h3>
          <p className="text-gray-600">La gestion complète des utilisateurs sera bientôt disponible</p>
        </div>
      </div>
    </div>
  );
}
