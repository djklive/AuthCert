import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import {
  Crown,
  Check,
  Calendar,
  Shield,
  Users,
  Award,
  Star,
  AlertCircle,
  Loader2,
  Smartphone,
  X,
} from 'lucide-react';
import { api, type SubscriptionSummary, type PaymentRecord, type PlanLimits } from '../../../services/api';
import { useTranslation } from 'react-i18next';

type BillingPeriod = 'mensuel' | 'annuel';

interface PlanDef {
  id: string;
  name: string;
  description: string;
  currency: string;
  prices: { mensuel: number; annuel: number };
  limits: PlanLimits;
}

const PURCHASABLE = ['PRO', 'EXCLUSIVE'];

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function pct(used: number, limit: number | null) {
  if (limit === null || limit === 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function SubscriptionScreen() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

  const limitLabel = (limit: number | null) => (limit === null ? t('subscription.unlimitedShort') : String(limit));

  const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
    TRIAL: { label: t('subscription.statusTrial'), cls: 'text-blue-600 border-blue-200 bg-blue-50' },
    ACTIF: { label: t('subscription.statusActif'), cls: 'text-green-600 border-green-200 bg-green-50' },
    PAST_DUE: { label: t('subscription.statusPastDue'), cls: 'text-orange-600 border-orange-200 bg-orange-50' },
    EXPIRE: { label: t('subscription.statusExpire'), cls: 'text-red-600 border-red-200 bg-red-50' },
    ANNULE: { label: t('subscription.statusAnnule'), cls: 'text-gray-600 border-gray-200 bg-gray-50' },
  };

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('mensuel');
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Paiement Mobile Money (charge directe)
  const [payModal, setPayModal] = useState<{ open: boolean; planId: string | null }>({ open: false, planId: null });
  const [operator, setOperator] = useState<'mtn' | 'orange'>('mtn');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, payRes] = await Promise.all([
        api.getMySubscription(),
        api.getPlans(),
        api.getSubscriptionPayments(),
      ]);
      if (subRes.success) setSummary(subRes.data);
      if (plansRes.success) {
        const all = plansRes.data.plans as Record<string, PlanDef>;
        setPlans(PURCHASABLE.map((id) => all[id]).filter(Boolean));
      }
      if (payRes.success) setPayments(payRes.data);
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : t('subscription.loadError') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Confirmer un paiement au retour de NotchPay (référence mémorisée avant redirection)
  useEffect(() => {
    const pendingRef = localStorage.getItem('pendingSubscriptionRef');
    if (!pendingRef) return;
    (async () => {
      try {
        const res = await api.verifySubscriptionPayment(pendingRef);
        if (res.success) {
          setAlert({ type: 'success', message: t('subscription.paymentConfirmed') });
          localStorage.removeItem('pendingSubscriptionRef');
          loadAll();
        } else {
          setAlert({ type: 'info', message: t('subscription.paymentConfirming') });
        }
      } catch {
        /* le webhook finalisera de toute façon */
      }
    })();
  }, [loadAll, t]);

  const handleSubscribe = (planId: string) => {
    setAlert(null);
    setPayStatus(null);
    setPayModal({ open: true, planId });
  };

  const pollPayment = (ref: string) => {
    let attempts = 0;
    const maxAttempts = 40; // ~ 2.5 min (40 x 4s)
    const tick = async () => {
      attempts += 1;
      try {
        const res = await api.verifySubscriptionPayment(ref);
        if (res.success) {
          localStorage.removeItem('pendingSubscriptionRef');
          setProcessing(false);
          setPayModal({ open: false, planId: null });
          setPhone('');
          setPayStatus(null);
          setAlert({ type: 'success', message: t('subscription.paymentConfirmed') });
          loadAll();
          return;
        }
        const st = (res.status || '').toLowerCase();
        if (['failed', 'canceled', 'cancelled', 'expired', 'rejected'].includes(st)) {
          setProcessing(false);
          setPayStatus(null);
          setAlert({ type: 'error', message: t('subscription.paymentFailed') });
          return;
        }
      } catch {
        /* on continue à interroger */
      }
      if (attempts >= maxAttempts) {
        setProcessing(false);
        setPayStatus(null);
        setAlert({
          type: 'info',
          message: t('subscription.paymentPending'),
        });
        return;
      }
      window.setTimeout(tick, 4000);
    };
    window.setTimeout(tick, 4000);
  };

  const doPayment = async () => {
    const planId = payModal.planId;
    if (!planId) return;

    const raw = phone.trim().replace(/\s+/g, '');
    if (!/^\+?\d{8,15}$/.test(raw)) {
      setAlert({ type: 'error', message: t('subscription.invalidPhone') });
      return;
    }
    const normalizedPhone = raw.startsWith('+') ? raw : `+237${raw}`;

    setProcessing(true);
    setAlert(null);
    setPayStatus(null);
    try {
      const res = await api.subscribe(planId, billingPeriod, { operator, phone: normalizedPhone });
      if (res.success && res.data?.mode === 'direct') {
        localStorage.setItem('pendingSubscriptionRef', res.data.reference);
        setPayStatus(t('subscription.paymentRequestSent'));
        pollPayment(res.data.reference);
      } else if (res.success && res.data?.paymentUrl) {
        localStorage.setItem('pendingSubscriptionRef', res.data.reference);
        window.location.href = res.data.paymentUrl;
      } else {
        setProcessing(false);
        setAlert({ type: 'error', message: res.message || t('subscription.paymentInitError') });
      }
    } catch (e) {
      setProcessing(false);
      setAlert({ type: 'error', message: e instanceof Error ? e.message : t('subscription.subscribeError') });
    }
  };

  const verifyPending = async (ref: string) => {
    setVerifyingRef(ref);
    try {
      const res = await api.verifySubscriptionPayment(ref);
      if (res.success) {
        setAlert({ type: 'success', message: t('subscription.paymentConfirmed') });
        loadAll();
      } else {
        setAlert({ type: 'info', message: t('subscription.paymentStillPending') });
      }
    } catch {
      setAlert({ type: 'error', message: t('subscription.verifyError') });
    } finally {
      setVerifyingRef(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const sub = summary?.subscription;
  const usage = summary?.usage;
  const statut = sub ? STATUT_LABEL[sub.statut] || STATUT_LABEL.TRIAL : STATUT_LABEL.TRIAL;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('subscription.title')}</h1>
        <p className="text-muted-foreground">
          {t('subscription.subtitle')}
        </p>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-xl text-sm ${
            alert.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : alert.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* Plan courant */}
      {sub && (
        <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t('subscription.planLabel', { name: sub.planName })}
                    <Badge className="bg-primary/10 text-primary border-primary/20">{t('subscription.current')}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {sub.actif
                      ? t('subscription.validUntil', { date: new Date(sub.dateFin).toLocaleDateString(dateLocale) })
                      : t('subscription.expiredUntil', { date: new Date(sub.dateFin).toLocaleDateString(dateLocale) })}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={statut.cls}>
                {statut.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {usage && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('subscription.certsIssued', { days: usage.fenetreJours })}</span>
                    <span className="text-sm font-medium">
                      {usage.certificats.utilises}/{limitLabel(usage.certificats.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.certificats.utilises, usage.certificats.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {usage.certificats.limite === null
                        ? t('subscription.unlimited')
                        : t('subscription.remaining', { count: usage.certificats.restant })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('subscription.linkedLearners')}</span>
                    <span className="text-sm font-medium">
                      {usage.apprenants.utilises}/{limitLabel(usage.apprenants.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.apprenants.utilises, usage.apprenants.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-muted-foreground">{t('subscription.totalActive')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('subscription.formationsLabel')}</span>
                    <span className="text-sm font-medium">
                      {usage.formations.utilises}/{limitLabel(usage.formations.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.formations.utilises, usage.formations.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-purple-600" />
                    <span className="text-xs text-muted-foreground">{t('subscription.created')}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bascule période */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-4 p-1 bg-muted rounded-xl">
          <Button
            variant={billingPeriod === 'mensuel' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingPeriod('mensuel')}
            className="rounded-lg"
          >
            {t('subscription.monthly')}
          </Button>
          <Button
            variant={billingPeriod === 'annuel' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingPeriod('annuel')}
            className="rounded-lg"
          >
            {t('subscription.annual')}
            <Badge variant="secondary" className="ml-2">{t('subscription.save')}</Badge>
          </Button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {plans.map((plan) => {
          const isCurrent = sub?.plan === plan.id && sub?.actif;
          const popular = plan.id === 'PRO';
          const amount = billingPeriod === 'annuel' ? plan.prices.annuel : plan.prices.mensuel;
          const monthlyEq = billingPeriod === 'annuel' ? Math.round(plan.prices.annuel / 12) : plan.prices.mensuel;
          return (
            <Card
              key={plan.id}
              className={`rounded-2xl relative ${popular ? 'border-primary shadow-lg' : 'border-border'} ${
                isCurrent ? 'bg-gradient-to-br from-primary/5 to-transparent' : ''
              }`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    {t('subscription.mostPopular')}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {isCurrent && <Badge variant="outline" className="text-xs">{t('subscription.current')}</Badge>}
                  {plan.id === 'EXCLUSIVE' && <Crown className="h-5 w-5 text-yellow-600" />}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatFcfa(amount)}</span>
                    <span className="text-muted-foreground">/{billingPeriod === 'annuel' ? t('subscription.perYear') : t('subscription.perMonth')}</span>
                  </div>
                  {billingPeriod === 'annuel' && (
                    <p className="text-sm text-green-600 mt-1">{t('subscription.monthlyEquivalent', { amount: formatFcfa(monthlyEq) })}</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.certificatsParMois === null
                      ? t('subscription.unlimitedCerts')
                      : t('subscription.certsPerMonth', { count: plan.limits.certificatsParMois })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.statsAvancees ? t('subscription.advancedStats') : t('subscription.basicStats')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.storageGB === null ? t('subscription.unlimitedStorage') : t('subscription.storageGB', { count: plan.limits.storageGB })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.apprenants === null ? t('subscription.unlimitedLearners') : t('subscription.learnersCount', { count: plan.limits.apprenants })}
                  </li>
                  {plan.limits.apiAccess && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      {t('subscription.apiAccess')}
                    </li>
                  )}
                </ul>

                <Separator />

                <Button
                  className="w-full rounded-xl"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isCurrent ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t('subscription.currentPlan')}
                    </>
                  ) : (
                    t('subscription.subscribePlan', { name: plan.name })
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Historique de paiement */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('subscription.paymentHistory')}
          </CardTitle>
          <CardDescription>{t('subscription.paymentHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('subscription.noPayment')}</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <p className="font-medium">{p.plan} • {p.periode === 'ANNUEL' ? t('subscription.annual') : t('subscription.monthly')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString(dateLocale)} • {p.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatFcfa(p.montant)}</span>
                    {p.statut === 'EN_ATTENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={verifyingRef === p.reference}
                        onClick={() => verifyPending(p.reference)}
                      >
                        {verifyingRef === p.reference ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          t('subscription.verify')
                        )}
                      </Button>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        p.statut === 'REUSSI'
                          ? 'text-green-600 border-green-200 bg-green-50'
                          : p.statut === 'EN_ATTENTE'
                          ? 'text-orange-600 border-orange-200 bg-orange-50'
                          : 'text-red-600 border-red-200 bg-red-50'
                      }
                    >
                      {p.statut === 'REUSSI' ? t('subscription.paid') : p.statut === 'EN_ATTENTE' ? t('subscription.pending') : t('subscription.failed')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info frais blockchain */}
      <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">{t('subscription.feesIncludedTitle')}</p>
            <p className="text-sm text-blue-700">
              {t('subscription.feesIncludedDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modale de paiement Mobile Money (charge directe) */}
      {payModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                {t('subscription.mobileMoneyPayment')}
              </h2>
              {!processing && (
                <button
                  onClick={() => setPayModal({ open: false, planId: null })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {!payStatus ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('subscription.operator')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOperator('mtn')}
                      className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                        operator === 'mtn'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      MTN Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperator('orange')}
                      className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                        operator === 'orange'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Orange Money
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('subscription.phoneNumber')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XX XX XX"
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('subscription.phoneHint')}
                  </p>
                </div>

                <Button className="w-full rounded-xl" disabled={processing} onClick={doPayment}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('subscription.initializing')}
                    </>
                  ) : (
                    t('subscription.payNow')
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4 py-2">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">{payStatus}</p>
                <p className="text-xs text-muted-foreground">
                  {t('subscription.payInstructions')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info frais blockchain */}
      <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">{t('subscription.feesIncludedTitle')}</p>
            <p className="text-sm text-blue-700">
              {t('subscription.feesIncludedDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
