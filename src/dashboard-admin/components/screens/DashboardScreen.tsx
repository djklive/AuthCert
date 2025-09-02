//import React from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { type NavigateFunction, type User, type KPI, type ActivityLog } from '../../types';

interface DashboardScreenProps {
  onNavigate: NavigateFunction;
  user: User;
}

export function DashboardScreen({ onNavigate, user }: DashboardScreenProps) {
  // Données simulées pour les KPIs
  const kpis: KPI[] = [
    {
      title: 'Total Établissements',
      value: '247',
      change: 12,
      changeType: 'increase',
      icon: 'Building2'
    },
    {
      title: 'Total Apprenants',
      value: '12,847',
      change: 8,
      changeType: 'increase',
      icon: 'Users'
    },
    {
      title: 'Certificats Émis',
      value: '8,234',
      change: 15,
      changeType: 'increase',
      icon: 'FileText'
    },
    {
      title: 'Vérifications',
      value: '45,892',
      change: 3,
      changeType: 'decrease',
      icon: 'Eye'
    }
  ];

  // Actions prioritaires
  const priorityActions = [
    {
      id: 1,
      title: '3 Établissements en attente de validation',
      type: 'warning',
      action: 'Voir les demandes',
      onClick: () => onNavigate('establishments')
    },
    {
      id: 2,
      title: '1 Signalement de fraude',
      type: 'error',
      action: 'Examiner',
      onClick: () => onNavigate('reports')
    },
    {
      id: 3,
      title: '5 Échecs de paiement',
      type: 'error',
      action: 'Gérer',
      onClick: () => onNavigate('subscriptions')
    }
  ];

  // Flux d'activité récente
  const recentActivity: ActivityLog[] = [
    {
      id: 1,
      action: 'Nouvel établissement inscrit',
      description: 'Université de Lyon a soumis sa demande',
      timestamp: 'Il y a 2 heures',
      user: 'Système',
      severity: 'info'
    },
    {
      id: 2,
      action: 'Certificats émis',
      description: 'Pic de 127 certificats émis aujourd\'hui',
      timestamp: 'Il y a 4 heures',
      user: 'Système',
      severity: 'success'
    },
    {
      id: 3,
      action: 'Paiement échoué',
      description: 'École Supérieure de Commerce - Plan Pro',
      timestamp: 'Il y a 6 heures',
      user: 'Système',
      severity: 'error'
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = { Building2, Users, FileText, Eye };
    return icons[iconName as keyof typeof icons] || Building2;
  };

  const getChangeIcon = (changeType: string) => {
    if (changeType === 'increase') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (changeType === 'decrease') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Bienvenue, {user.name}. Voici un aperçu de votre plateforme.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Dernière mise à jour</p>
          <p className="text-sm font-medium text-gray-900">Il y a 2 minutes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = getIcon(kpi.icon);
          return (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                {getChangeIcon(kpi.changeType)}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-600">{kpi.title}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getChangeIcon(kpi.changeType)}
                  <span className={`text-sm font-medium ${
                    kpi.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.change}% ce mois
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Prioritaires et Revenus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions Prioritaires */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Prioritaires</h2>
          <div className="space-y-3">
            {priorityActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {action.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  {action.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  <div>
                    <p className="font-medium text-gray-900">{action.title}</p>
                  </div>
                </div>
                <button
                  onClick={action.onClick}
                  className="px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  {action.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Widget Revenus */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenus (MRR)</h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">€24,500</div>
            <p className="text-sm text-gray-600 mb-4">Revenus mensuels récurrents</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Basic:</span>
                <span className="font-medium">€8,200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Pro:</span>
                <span className="font-medium">€12,800</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Premium:</span>
                <span className="font-medium">€3,500</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="w-full mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
            >
              Voir le rapport complet
            </button>
          </div>
        </div>
      </div>

      {/* Flux d'Activité Récente */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              {getSeverityIcon(activity.severity)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-500">{activity.timestamp}</span>
                  <span className="text-xs text-gray-500">par {activity.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onNavigate('reports')}
            className="text-rose-600 hover:text-rose-700 font-medium text-sm"
          >
            Voir toute l'activité →
          </button>
        </div>
      </div>
    </div>
  );
}
