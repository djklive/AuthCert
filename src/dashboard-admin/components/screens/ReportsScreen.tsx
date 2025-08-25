import React from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { type NavigateFunction } from '../../types';

interface ReportsScreenProps {
  onNavigate: NavigateFunction;
}

export function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-600">Consultez les données et métriques de votre plateforme</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapport financier</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">MRR actuel</span>
              <span className="font-bold text-2xl text-rose-600">€24,500</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Croissance MRR</span>
              <span className="font-bold text-green-600">+12%</span>
            </div>
            <button className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Télécharger le rapport
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Période d'analyse</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Derniers 30 jours</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                7 jours
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                30 jours
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                90 jours
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                1 an
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
