import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  CreditCard,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { type AdminNotification, type AdminActivityItem } from '../../types';

type Tab = 'notifications' | 'activity';

function notifIcon(type: string) {
  switch (type) {
    case 'ETABLISSEMENT_INSCRIPTION':
      return <Building2 className="w-4 h-4 text-amber-600" />;
    case 'PAIEMENT_ECHOUE':
      return <CreditCard className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-blue-600" />;
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    default: return <Clock className="w-4 h-4 text-blue-600" />;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR');
}

export function NotificationsScreen() {
  const [tab, setTab] = useState<Tab>('notifications');

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminActivity(30);
      setActivity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'activité');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'notifications') loadNotifications();
    else loadActivity();
  }, [tab]);

  const unreadCount = notifications.filter((n) => !n.lu).length;

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const refresh = () => (tab === 'notifications' ? loadNotifications() : loadActivity());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications &amp; Activité</h1>
          <p className="text-gray-600">Suivez les notifications et l'activité de la plateforme</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('notifications')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'notifications' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'activity' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activité
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
        </div>
      ) : tab === 'notifications' ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm text-gray-600">{notifications.length} notification(s)</p>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer comme lu
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Aucune notification.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-4 ${n.lu ? '' : 'bg-rose-50/50'}`}>
                  <div className="mt-0.5">{notifIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{n.titre}</p>
                      {!n.lu && <span className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0" />}
                      {n.important && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Important</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.lu && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="divide-y divide-gray-100">
            {activity.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Aucune activité récente.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-4">
                  <div className="mt-0.5">{severityIcon(a.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{a.action}</p>
                    <p className="text-sm text-gray-600">{a.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-400">{a.timeAgo}</span>
                      <span className="text-xs text-gray-400">par {a.user}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
