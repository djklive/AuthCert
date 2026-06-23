import { useEffect, useState } from 'react';
import { Download, Calendar, TrendingUp, AlertTriangle, Loader2, RefreshCw, Building2, FileText, Eye } from 'lucide-react';
import { api, type SubscriptionStats } from '../../services/api';
import { type AdminStats } from '../../types';

const PERIODS = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
  { label: '1 an', days: 365 },
];

export function ReportsScreen() {
  const [days, setDays] = useState(30);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      const [sub, adminStats] = await Promise.all([
        api.getSubscriptionStats(),
        api.getAdminStats(period),
      ]);
      setSubStats(sub);
      setStats(adminStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const formatMoney = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR')} ${currency}`;

  const currentPeriodLabel = PERIODS.find((p) => p.days === days)?.label ?? `${days} jours`;

  const handleDownloadCsv = () => {
    if (!subStats || !stats) return;

    const rows: string[][] = [
      ['Rapport AuthCert', new Date().toLocaleString('fr-FR')],
      ['Période', currentPeriodLabel],
      [],
      ['Indicateur', 'Valeur'],
      ['Total établissements', String(stats.kpis.etablissements.value)],
      ['Total apprenants', String(stats.kpis.apprenants.value)],
      ['Certificats émis', String(stats.kpis.certificats.value)],
      ['Vérifications', String(stats.kpis.verifications.value)],
      [],
      [`Nouveaux établissements (${currentPeriodLabel})`, String(stats.period.newEstablishments)],
      [`Nouveaux certificats (${currentPeriodLabel})`, String(stats.period.newCertificates)],
      [`Nouvelles vérifications (${currentPeriodLabel})`, String(stats.period.newVerifications)],
      [],
      ['Revenu total', formatMoney(subStats.revenuTotal, subStats.currency)],
      ['Paiements réussis', String(subStats.paiementsReussis)],
      ['Paiements échoués', String(subStats.paiementsEchoues)],
      [],
      ['Abonnements par plan', ''],
      ...subStats.parPlan.map((p) => [p.plan, String(p.count)]),
      [],
      ['Abonnements par statut', ''],
      ...subStats.parStatut.map((s) => [s.statut, String(s.count)]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-authcert-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-600">Consultez les données et métriques de votre plateforme</p>
        </div>
        <button
          onClick={() => load(days)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Période d'analyse */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Période d'analyse</h2>
          <span className="text-sm text-gray-500">({currentPeriodLabel})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                days === p.days
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-rose-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.period.newEstablishments}</p>
                <p className="text-xs text-gray-600">Nouveaux établissements</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-rose-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.period.newCertificates}</p>
                <p className="text-xs text-gray-600">Nouveaux certificats</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Eye className="w-5 h-5 text-rose-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.period.newVerifications}</p>
                <p className="text-xs text-gray-600">Nouvelles vérifications</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && !subStats ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des rapports…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rapport financier */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapport financier</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Revenu total</span>
                <span className="font-bold text-2xl text-rose-600">
                  {subStats ? formatMoney(subStats.revenuTotal, subStats.currency) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Paiements réussis</span>
                <span className="font-bold text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {subStats?.paiementsReussis ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Paiements échoués</span>
                <span className="font-bold text-red-600">{subStats?.paiementsEchoues ?? 0}</span>
              </div>
              <button
                onClick={handleDownloadCsv}
                disabled={!subStats || !stats}
                className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Télécharger le rapport (CSV)
              </button>
            </div>
          </div>

          {/* Répartition des abonnements */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition des abonnements</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Par plan</p>
                <div className="space-y-2">
                  {subStats && subStats.parPlan.length > 0 ? (
                    subStats.parPlan.map((p) => (
                      <div key={p.plan} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{p.plan}</span>
                        <span className="font-medium text-gray-900">{p.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">Aucune donnée</p>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Par statut</p>
                <div className="space-y-2">
                  {subStats && subStats.parStatut.length > 0 ? (
                    subStats.parStatut.map((s) => (
                      <div key={s.statut} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{s.statut}</span>
                        <span className="font-medium text-gray-900">{s.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
