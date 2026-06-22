import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, XCircle, RefreshCw, Crown } from 'lucide-react';
import { api, type AdminSubscription, type SubscriptionStats } from '../../services/api';

function formatFcfa(n: number) {
  return `${(n || 0).toLocaleString('fr-FR')} FCFA`;
}

const STATUT_STYLE: Record<string, string> = {
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIF: 'bg-green-50 text-green-700 border-green-200',
  PAST_DUE: 'bg-orange-50 text-orange-700 border-orange-200',
  EXPIRE: 'bg-red-50 text-red-700 border-red-200',
  ANNULE: 'bg-gray-50 text-gray-700 border-gray-200',
};

const STATUT_LABEL: Record<string, string> = {
  TRIAL: 'Essai',
  ACTIF: 'Actif',
  PAST_DUE: 'En retard',
  EXPIRE: 'Expiré',
  ANNULE: 'Annulé',
};

export function SubscriptionsScreen() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overriding, setOverriding] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, st] = await Promise.all([api.getSubscriptions(), api.getSubscriptionStats()]);
      setSubs(s);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOverride = async (etablissementId: number, plan: string) => {
    setOverriding(etablissementId);
    try {
      await api.overrideSubscription(etablissementId, plan, 'mensuel');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'override");
    } finally {
      setOverriding(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Abonnements</h1>
          <p className="text-gray-600">Revenus, abonnements et paiements des établissements</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Revenu total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats ? formatFcfa(stats.revenuTotal) : '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm">Paiements réussis</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.paiementsReussis ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm">Paiements échoués</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.paiementsEchoues ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Crown className="w-4 h-4 text-rose-600" />
            <span className="text-sm">Abonnements actifs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.parStatut.filter((s) => s.statut === 'ACTIF' || s.statut === 'TRIAL').reduce((a, b) => a + b.count, 0) : '—'}
          </p>
        </div>
      </div>

      {/* Liste des abonnements */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Abonnements par établissement</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : subs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun abonnement</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Établissement</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-left font-medium px-4 py-3">Statut</th>
                  <th className="text-left font-medium px-4 py-3">Échéance</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.etablissement?.nomEtablissement}</p>
                      <p className="text-xs text-gray-500">{s.etablissement?.emailEtablissement}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUT_STYLE[s.statut] || ''}`}>
                        {STATUT_LABEL[s.statut] || s.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(s.dateFin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOverride(s.etablissement.id_etablissement, 'PRO')}
                          disabled={overriding === s.etablissement.id_etablissement}
                          className="px-2 py-1 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                        >
                          +1 mois Pro
                        </button>
                        <button
                          onClick={() => handleOverride(s.etablissement.id_etablissement, 'EXCLUSIVE')}
                          disabled={overriding === s.etablissement.id_etablissement}
                          className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          +1 mois Exclusive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
