import React from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { type NavigateFunction } from '../../types';

interface SubscriptionsScreenProps {
  onNavigate: NavigateFunction;
}

export function SubscriptionsScreen({ onNavigate }: SubscriptionsScreenProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Abonnements</h1>
          <p className="text-gray-600">Surveillez et gérez les abonnements et paiements</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes de paiement</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">5 Échecs de paiement</p>
                <p className="text-sm text-red-700">Action requise</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans d'abonnement</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Plan Basic</span>
                <span className="text-rose-600 font-bold">€29/mois</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Plan Pro</span>
                <span className="text-rose-600 font-bold">€79/mois</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Plan Premium</span>
                <span className="text-rose-600 font-bold">€149/mois</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Codes promotionnels</h2>
          <button className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
            Créer un code promo
          </button>
        </div>
      </div>
    </div>
  );
}
