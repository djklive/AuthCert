import { useState, useEffect } from 'react';
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
  Wallet,
  ExternalLink,
  Droplet,
  RefreshCw,
} from 'lucide-react';
import { type NavigateFunction, type User, type KPI, type ActivityLog } from '../../types';
import { api, type RelayerWalletInfo } from '../../services/api';

interface DashboardScreenProps {
  onNavigate: NavigateFunction;
  user: User;
}

export function DashboardScreen({ onNavigate, user }: DashboardScreenProps) {
  const [relayer, setRelayer] = useState<RelayerWalletInfo | null>(null);
  const [relayerLoading, setRelayerLoading] = useState(false);
  const [relayerError, setRelayerError] = useState<string | null>(null);

  const loadRelayer = async () => {
    setRelayerLoading(true);
    setRelayerError(null);
    try {
      const info = await api.getRelayerWallet();
      setRelayer(info);
    } catch (err) {
      setRelayerError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setRelayerLoading(false);
    }
  };

  useEffect(() => {
    loadRelayer();
  }, []);
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
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm lg:text-base text-gray-600">Bienvenue, {user.name}. Voici un aperçu de votre plateforme.</p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-xs lg:text-sm text-gray-500">Dernière mise à jour</p>
          <p className="text-xs lg:text-sm font-medium text-gray-900">Il y a 2 minutes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, index) => {
          const Icon = getIcon(kpi.icon);
          return (
            <div key={index} className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />
                </div>
                {getChangeIcon(kpi.changeType)}
              </div>
              <div className="mt-3 lg:mt-4">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs lg:text-sm text-gray-600">{kpi.title}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getChangeIcon(kpi.changeType)}
                  <span className={`text-xs lg:text-sm font-medium ${
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

      {/* Wallet Relayer / Trésorerie */}
      <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 rounded-lg">
              <Wallet className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-gray-900">Wallet Relayer / Trésorerie</h2>
              <p className="text-xs lg:text-sm text-gray-500">
                Portefeuille de la plateforme qui paie les frais blockchain (gas) pour tous les établissements.
              </p>
            </div>
          </div>
          <button
            onClick={loadRelayer}
            disabled={relayerLoading}
            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${relayerLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {relayerError ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{relayerError}</span>
          </div>
        ) : relayerLoading && !relayer ? (
          <p className="text-sm text-gray-500">Chargement des informations du wallet…</p>
        ) : relayer ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Adresse</p>
              <p className="font-mono text-xs lg:text-sm text-gray-900 break-all">{relayer.address}</p>
              <p className="text-xs text-gray-500 mt-2">{relayer.network}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg flex flex-col justify-center">
              <p className="text-xs text-gray-500 mb-1">Solde</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                {relayer.balance} <span className="text-sm font-medium text-gray-500">{relayer.currency}</span>
              </p>
              {relayer.balanceError && (
                <p className="text-xs text-amber-600 mt-1">Solde indisponible</p>
              )}
            </div>
            <div className="sm:col-span-3 flex flex-wrap gap-2">
              <a
                href={relayer.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Voir sur l'explorer
              </a>
              <a
                href={relayer.faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Droplet className="w-4 h-4" />
                Approvisionner (faucet)
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions Prioritaires et Revenus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Actions Prioritaires */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Actions Prioritaires</h2>
          <div className="space-y-3">
            {priorityActions.map((action) => (
              <div key={action.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
                <div className="flex items-center gap-3">
                  {action.type === 'warning' && <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 flex-shrink-0" />}
                  {action.type === 'error' && <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm lg:text-base">{action.title}</p>
                  </div>
                </div>
                <button
                  onClick={action.onClick}
                  className="w-full sm:w-auto px-3 py-1.5 text-xs lg:text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  {action.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Widget Revenus */}
        {/*<div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Revenus (MRR)</h2>
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">€24,500</div>
            <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">Revenus mensuels récurrents</p>
            <div className="space-y-2 text-xs lg:text-sm">
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
              className="w-full mt-3 lg:mt-4 px-3 lg:px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm lg:text-base"
            >
              Voir le rapport complet
            </button>
          </div>
        </div>*/}
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
