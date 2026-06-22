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
} from 'lucide-react';
import { api, type SubscriptionSummary, type PaymentRecord, type PlanLimits } from '../../../services/api';

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

function limitLabel(limit: number | null) {
  return limit === null ? 'illimité' : String(limit);
}

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  TRIAL: { label: "Essai gratuit", cls: 'text-blue-600 border-blue-200 bg-blue-50' },
  ACTIF: { label: 'Actif', cls: 'text-green-600 border-green-200 bg-green-50' },
  PAST_DUE: { label: 'Paiement en retard', cls: 'text-orange-600 border-orange-200 bg-orange-50' },
  EXPIRE: { label: 'Expiré', cls: 'text-red-600 border-red-200 bg-red-50' },
  ANNULE: { label: 'Annulé', cls: 'text-gray-600 border-gray-200 bg-gray-50' },
};

export function SubscriptionScreen() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('mensuel');
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

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
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }, []);

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
          setAlert({ type: 'success', message: 'Paiement confirmé, abonnement activé !' });
          localStorage.removeItem('pendingSubscriptionRef');
          loadAll();
        } else {
          setAlert({ type: 'info', message: 'Paiement en cours de confirmation…' });
        }
      } catch {
        /* le webhook finalisera de toute façon */
      }
    })();
  }, [loadAll]);

  const handleSubscribe = async (planId: string) => {
    setSubscribingPlan(planId);
    setAlert(null);
    try {
      const res = await api.subscribe(planId, billingPeriod);
      if (res.success && res.data?.paymentUrl) {
        localStorage.setItem('pendingSubscriptionRef', res.data.reference);
        window.location.href = res.data.paymentUrl;
      } else {
        setAlert({ type: 'error', message: res.message || "Impossible d'initialiser le paiement" });
      }
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Erreur lors de la souscription' });
    } finally {
      setSubscribingPlan(null);
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
        <h1 className="text-3xl font-bold">Gestion d'abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre plan, suivez votre utilisation et vos paiements
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
                    Plan {sub.planName}
                    <Badge className="bg-primary/10 text-primary border-primary/20">Actuel</Badge>
                  </CardTitle>
                  <CardDescription>
                    {sub.actif ? 'Valable' : 'Expiré le'} jusqu'au{' '}
                    {new Date(sub.dateFin).toLocaleDateString('fr-FR')}
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
                    <span className="text-sm text-muted-foreground">Certificats émis ({usage.fenetreJours} j)</span>
                    <span className="text-sm font-medium">
                      {usage.certificats.utilises}/{limitLabel(usage.certificats.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.certificats.utilises, usage.certificats.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {usage.certificats.limite === null
                        ? 'Illimité'
                        : `${usage.certificats.restant} restant(s)`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Apprenants liés</span>
                    <span className="text-sm font-medium">
                      {usage.apprenants.utilises}/{limitLabel(usage.apprenants.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.apprenants.utilises, usage.apprenants.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-muted-foreground">Total actifs</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Formations</span>
                    <span className="text-sm font-medium">
                      {usage.formations.utilises}/{limitLabel(usage.formations.limite)}
                    </span>
                  </div>
                  <Progress value={pct(usage.formations.utilises, usage.formations.limite)} className="h-2" />
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Créées</span>
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
            Mensuel
          </Button>
          <Button
            variant={billingPeriod === 'annuel' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingPeriod('annuel')}
            className="rounded-lg"
          >
            Annuel
            <Badge variant="secondary" className="ml-2">Économisez</Badge>
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
                    Plus populaire
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {isCurrent && <Badge variant="outline" className="text-xs">Actuel</Badge>}
                  {plan.id === 'EXCLUSIVE' && <Crown className="h-5 w-5 text-yellow-600" />}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatFcfa(amount)}</span>
                    <span className="text-muted-foreground">/{billingPeriod === 'annuel' ? 'an' : 'mois'}</span>
                  </div>
                  {billingPeriod === 'annuel' && (
                    <p className="text-sm text-green-600 mt-1">Soit {formatFcfa(monthlyEq)}/mois</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.certificatsParMois === null
                      ? 'Certificats illimités'
                      : `${plan.limits.certificatsParMois} certificats / mois`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.statsAvancees ? 'Statistiques avancées' : 'Statistiques de base'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.storageGB === null ? 'Stockage illimité' : `${plan.limits.storageGB} GB de stockage`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {plan.limits.apprenants === null ? 'Apprenants illimités' : `${plan.limits.apprenants} apprenants`}
                  </li>
                  {plan.limits.apiAccess && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      Accès API
                    </li>
                  )}
                </ul>

                <Separator />

                <Button
                  className="w-full rounded-xl"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || subscribingPlan !== null}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {subscribingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirection…
                    </>
                  ) : isCurrent ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Plan actuel
                    </>
                  ) : (
                    `Souscrire ${plan.name}`
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
            Historique de paiement
          </CardTitle>
          <CardDescription>Vos transactions d'abonnement</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun paiement pour le moment</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <p className="font-medium">{p.plan} • {p.periode === 'ANNUEL' ? 'Annuel' : 'Mensuel'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')} • {p.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatFcfa(p.montant)}</span>
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
                      {p.statut === 'REUSSI' ? 'Payé' : p.statut === 'EN_ATTENTE' ? 'En attente' : 'Échoué'}
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
            <p className="font-medium text-blue-900">Frais blockchain inclus</p>
            <p className="text-sm text-blue-700">
              Les frais de publication sur la blockchain sont pris en charge par AuthCert dans le cadre de
              votre abonnement. Vous n'avez aucun portefeuille crypto à gérer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
