import { useEffect, useState } from 'react';
import {
  Shield,
  Bell,
  Globe,
  Lock,
  Monitor,
  Smartphone,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { type AdminSettings, type AdminSession } from '../../types';

const DEFAULT_SETTINGS: AdminSettings = {
  emailAlerts: true,
  pushNotifications: false,
  autoReports: false,
  language: 'fr',
  theme: 'light',
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-rose-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function SettingsScreen() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [cleaning, setCleaning] = useState(false);

  // Modale mot de passe
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  const flash = (setter: (v: string | null) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(null), 4000);
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminSettings();
      setSettings({
        emailAlerts: data.emailAlerts,
        pushNotifications: data.pushNotifications,
        autoReports: data.autoReports,
        language: data.language,
        theme: data.theme,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await api.getAdminSessions();
      setSessions(data);
    } catch (err) {
      console.error('Erreur sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadSessions();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateAdminSettings(settings);
      flash(setSuccess, 'Paramètres enregistrés avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (id: number) => {
    try {
      await api.terminateAdminSession(id);
      flash(setSuccess, 'Session terminée');
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la session');
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    setError(null);
    try {
      const count = await api.cleanupSessions();
      flash(setSuccess, `${count} session(s) expirée(s) nettoyée(s)`);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du nettoyage');
    } finally {
      setCleaning(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    if (pwd.next !== pwd.confirm) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (pwd.next.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword(pwd.current, pwd.next);
      setShowPasswordDialog(false);
      setPwd({ current: '', next: '', confirm: '' });
      flash(setSuccess, 'Mot de passe modifié avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Configurez votre plateforme d'administration</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des paramètres…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Préférences (notifications) */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-rose-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Alertes par email</p>
                  <p className="text-sm text-gray-500">Recevoir les alertes importantes par email</p>
                </div>
                <Toggle checked={settings.emailAlerts} onChange={(v) => setSettings({ ...settings, emailAlerts: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notifications push</p>
                  <p className="text-sm text-gray-500">Notifications dans le navigateur</p>
                </div>
                <Toggle checked={settings.pushNotifications} onChange={(v) => setSettings({ ...settings, pushNotifications: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Rapports automatiques</p>
                  <p className="text-sm text-gray-500">Recevoir un rapport périodique</p>
                </div>
                <Toggle checked={settings.autoReports} onChange={(v) => setSettings({ ...settings, autoReports: v })} />
              </div>
            </div>
          </div>

          {/* Général */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-rose-600" />
              <h2 className="text-lg font-semibold text-gray-900">Général</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langue et région</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value as 'fr' | 'en' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-rose-500 focus:outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thème d'interface</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-rose-500 focus:outline-none"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bouton d'enregistrement des préférences */}
          <div className="lg:col-span-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Enregistrer les préférences
            </button>
          </div>

          {/* Sécurité */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-rose-600" />
              <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-gray-600" />
                Changer le mot de passe
              </button>
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center gap-2 disabled:opacity-50"
              >
                {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-gray-600" />}
                Nettoyer les sessions expirées
              </button>
            </div>
          </div>

          {/* Historique des connexions / sessions actives */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-rose-600" />
                <h2 className="text-lg font-semibold text-gray-900">Sessions actives</h2>
              </div>
              <button
                onClick={loadSessions}
                disabled={sessionsLoading}
                className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune session active.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        {s.type === 'mobile' ? <Smartphone className="w-4 h-4 text-gray-600" /> : <Monitor className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.device}</p>
                        <p className="text-xs text-gray-500">{s.location} · {s.lastActive}</p>
                      </div>
                    </div>
                    {s.current ? (
                      <span className="px-2 py-1 text-xs font-medium bg-rose-50 text-rose-700 rounded-full">Actuelle</span>
                    ) : (
                      <button
                        onClick={() => handleTerminateSession(s.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Terminer la session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale changement de mot de passe */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h3>
              <button onClick={() => setShowPasswordDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleChangePassword}
                disabled={pwdSaving || !pwd.current || !pwd.next || !pwd.confirm}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Changer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
