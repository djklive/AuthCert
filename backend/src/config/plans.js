// =============================================================================
// Source UNIQUE des plans d'abonnement AuthCert (établissements uniquement).
// Aligné sur la page Tarif publique (FCFA). Toute la logique (backend + UI)
// doit consommer ce fichier — ne plus coder les plans en dur dans le frontend.
//
// Devise : XAF (FCFA). Montants en entiers (pas de centimes).
// `null` dans les limites = illimité.
// Quota d'émission = fenêtre MENSUELLE GLISSANTE (30 derniers jours).
// =============================================================================

const CURRENCY = 'XAF';
const TRIAL_DURATION_DAYS = 30;
const QUOTA_WINDOW_DAYS = 30;

const PLANS = {
  TRIAL: {
    id: 'TRIAL',
    name: 'Essai gratuit',
    description: "30 jours d'accès complet pour découvrir AuthCert",
    currency: CURRENCY,
    // Pas de paiement pour l'essai
    prices: { mensuel: 0, annuel: 0 },
    durationDays: TRIAL_DURATION_DAYS,
    limits: {
      certificatsParMois: 25,   // plan gratuit : plafonds anti-abus
      apprenants: 25,           // nombre d'apprenants liables
      formations: 25,           // nombre de formations
      storageGB: 100,
      statsAvancees: true,
      apiAccess: false,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'Pour les établissements en activité régulière',
    currency: CURRENCY,
    // mensuel = facturé au mois ; annuel = total payé pour 12 mois (25 000 FCFA/mois)
    prices: { mensuel: 30000, annuel: 300000 },
    limits: {
      certificatsParMois: 50,
      apprenants: null,
      formations: null,
      storageGB: 100,
      statsAvancees: false,
      apiAccess: false,
    },
  },
  EXCLUSIVE: {
    id: 'EXCLUSIVE',
    name: 'Exclusive',
    description: 'Pour les grandes institutions, sans limite',
    currency: CURRENCY,
    // mensuel = 65 000 FCFA/mois ; annuel = total payé pour 12 mois (55 000 FCFA/mois)
    prices: { mensuel: 65000, annuel: 660000 },
    limits: {
      certificatsParMois: null, // illimité
      apprenants: null,
      formations: null,
      storageGB: null,
      statsAvancees: true,
      apiAccess: true,
    },
  },
};

const PAID_PLANS = ['PRO', 'EXCLUSIVE'];

function getPlan(planId) {
  return PLANS[planId] || null;
}

/**
 * Montant à facturer pour un plan + une périodicité ('mensuel' | 'annuel').
 * Retourne null si plan inconnu ou non payant.
 */
function getAmount(planId, periode) {
  const plan = getPlan(planId);
  if (!plan) return null;
  const key = periode === 'annuel' ? 'annuel' : 'mensuel';
  return plan.prices[key];
}

/**
 * Limites effectives d'un plan (objet limits) ; plan inconnu -> limites TRIAL.
 */
function getLimits(planId) {
  const plan = getPlan(planId);
  return plan ? plan.limits : PLANS.TRIAL.limits;
}

/**
 * Nombre de jours couverts par une périodicité.
 */
function getPeriodDays(periode) {
  return periode === 'annuel' ? 365 : 30;
}

module.exports = {
  PLANS,
  PAID_PLANS,
  CURRENCY,
  TRIAL_DURATION_DAYS,
  QUOTA_WINDOW_DAYS,
  getPlan,
  getAmount,
  getLimits,
  getPeriodDays,
};
