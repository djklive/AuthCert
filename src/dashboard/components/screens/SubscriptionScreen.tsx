import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  Crown, 
  Check, 
  CreditCard, 
  Download, 
  Calendar,
  Zap,
  Shield,
  Users,
  Award,
  Eye,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Star
} from 'lucide-react';

/*interface SubscriptionScreenProps {
  onNavigate: (screen: string) => void;
}*/

export function SubscriptionScreen() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Current subscription data
  const currentPlan = {
    name: 'PRO',
    price: billingPeriod === 'monthly' ? 49 : 490,
    period: billingPeriod === 'monthly' ? 'mois' : 'an',
    nextBilling: '2024-02-15',
    status: 'active'
  };

  // Usage data
  const usage = {
    certificates: { used: 25, limit: 100, percentage: 25 },
    verifications: { used: 1523, limit: 5000, percentage: 30.5 },
    students: { used: 89, limit: 500, percentage: 17.8 },
    storage: { used: 2.3, limit: 10, percentage: 23 }
  };

  // Plans data
  const plans = [
    {
      name: 'STARTER',
      description: 'Pour débuter avec les certificats numériques',
      price: billingPeriod === 'monthly' ? 19 : 190,
      period: billingPeriod === 'monthly' ? 'mois' : 'an',
      features: [
        '25 certificats/mois',
        '1000 vérifications/mois',
        '50 étudiants',
        '2GB de stockage',
        'Support email',
        'Templates de base'
      ],
      limits: {
        certificates: 25,
        verifications: 1000,
        students: 50,
        storage: 2
      },
      popular: false,
      current: false
    },
    {
      name: 'PRO',
      description: 'Pour les établissements en croissance',
      price: billingPeriod === 'monthly' ? 49 : 490,
      period: billingPeriod === 'monthly' ? 'mois' : 'an',
      features: [
        '100 certificats/mois',
        '5000 vérifications/mois',
        '500 étudiants',
        '10GB de stockage',
        'Support prioritaire',
        'Templates avancés',
        'API access',
        'Analytics avancées'
      ],
      limits: {
        certificates: 100,
        verifications: 5000,
        students: 500,
        storage: 10
      },
      popular: true,
      current: true
    },
    {
      name: 'ENTERPRISE',
      description: 'Pour les grandes institutions',
      price: billingPeriod === 'monthly' ? 149 : 1490,
      period: billingPeriod === 'monthly' ? 'mois' : 'an',
      features: [
        'Certificats illimités',
        'Vérifications illimitées',
        'Étudiants illimités',
        '100GB de stockage',
        'Support dédié 24/7',
        'Templates personnalisés',
        'API complète',
        'Analytics avancées',
        'White-label',
        'SSO/SAML'
      ],
      limits: {
        certificates: Infinity,
        verifications: Infinity,
        students: Infinity,
        storage: 100
      },
      popular: false,
      current: false
    }
  ];

  const paymentHistory = [
    { date: '2024-01-15', amount: 49, status: 'paid', invoice: 'INV-2024-001' },
    { date: '2023-12-15', amount: 49, status: 'paid', invoice: 'INV-2023-012' },
    { date: '2023-11-15', amount: 49, status: 'paid', invoice: 'INV-2023-011' },
    { date: '2023-10-15', amount: 49, status: 'paid', invoice: 'INV-2023-010' }
  ];

  const savings = billingPeriod === 'yearly' ? '2 mois offerts' : null;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion d'abonnement</h1>
          <p className="text-muted-foreground">
            Gérez votre plan, consultez vos factures et optimisez votre utilisation
          </p>
        </div>
        <Button variant="outline" className="rounded-xl">
          <Download className="h-4 w-4 mr-2" />
          Télécharger facture
        </Button>
      </div>

      {/* Current Plan Overview */}
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan {currentPlan.name}
                  <Badge className="bg-primary/10 text-primary border-primary/20">Actuel</Badge>
                </CardTitle>
                <CardDescription>
                  {currentPlan.price}€/{currentPlan.period} • Prochaine facture le {new Date(currentPlan.nextBilling).toLocaleDateString('fr-FR')}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
              <Check className="h-3 w-3 mr-1" />
              Actif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Certificats</span>
                <span className="text-sm font-medium">{usage.certificates.used}/{usage.certificates.limit}</span>
              </div>
              <Progress value={usage.certificates.percentage} className="h-2" />
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">{usage.certificates.percentage}% utilisé</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vérifications</span>
                <span className="text-sm font-medium">{usage.verifications.used}/{usage.verifications.limit}</span>
              </div>
              <Progress value={usage.verifications.percentage} className="h-2" />
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-muted-foreground">{usage.verifications.percentage}% utilisé</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Étudiants</span>
                <span className="text-sm font-medium">{usage.students.used}/{usage.students.limit}</span>
              </div>
              <Progress value={usage.students.percentage} className="h-2" />
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-green-600" />
                <span className="text-xs text-muted-foreground">{usage.students.percentage}% utilisé</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stockage</span>
                <span className="text-sm font-medium">{usage.storage.used}GB/{usage.storage.limit}GB</span>
              </div>
              <Progress value={usage.storage.percentage} className="h-2" />
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-muted-foreground">{usage.storage.percentage}% utilisé</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-4 p-1 bg-muted rounded-xl">
          <Button
            variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingPeriod('monthly')}
            className="rounded-lg"
          >
            Mensuel
          </Button>
          <Button
            variant={billingPeriod === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingPeriod('yearly')}
            className="rounded-lg"
          >
            Annuel
            {savings && (
              <Badge variant="secondary" className="ml-2">
                {savings}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`rounded-2xl relative ${
              plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border'
            } ${plan.current ? 'bg-gradient-to-br from-primary/5 to-transparent' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Plus populaire
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {plan.current && (
                    <Badge variant="outline" className="text-xs">Actuel</Badge>
                  )}
                </CardTitle>
                {plan.name === 'ENTERPRISE' && (
                  <Crown className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}€</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm text-green-600 mt-1">
                    Soit {Math.round(plan.price / 12)}€/mois
                  </p>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Separator />
              
              <div className="space-y-2">
                {plan.current ? (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Plan actuel
                  </Button>
                ) : plan.limits.certificates > usage.certificates.limit ? (
                  <Button className="w-full rounded-xl">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Passer au plan {plan.name}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full rounded-xl">
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Rétrograder vers {plan.name}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Moyen de paiement
            </CardTitle>
            <CardDescription>
              Gérez vos informations de facturation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">VISA</span>
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expire 12/2025</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">
                Modifier
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Prochaine facture</span>
                <span className="text-sm font-medium">{new Date(currentPlan.nextBilling).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className="text-sm font-medium">{currentPlan.price}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TVA (20%)</span>
                <span className="text-sm font-medium">{Math.round(currentPlan.price * 0.2)}€</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-medium">{Math.round(currentPlan.price * 1.2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Historique de facturation
                </CardTitle>
                <CardDescription>
                  Vos dernières factures
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.invoice} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <p className="font-medium">{payment.invoice}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{payment.amount}€</span>
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <Check className="h-3 w-3 mr-1" />
                      Payé
                    </Badge>
                    <Button variant="ghost" size="sm" className="rounded-lg">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Alerts */}
      <Card className="rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            Alertes d'utilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-orange-100 border border-orange-200 rounded-xl">
            <Zap className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <p className="font-medium text-orange-800">Approche de la limite</p>
              <p className="text-sm text-orange-700">
                Vous avez utilisé 30% de vos vérifications mensuelles. Pensez à passer au plan supérieur si nécessaire.
              </p>
            </div>
          </div>
          <div className="text-center">
            <Button variant="outline" className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50">
              Configurer les alertes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}