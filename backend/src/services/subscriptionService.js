// =============================================================================
// Service de gestion des abonnements établissements.
// - Essai gratuit (TRIAL) auto-créé 30 jours
// - Activation / extension après paiement (périodes prépayées, pas d'auto-débit)
// - Calcul d'usage : quota d'émission sur fenêtre mensuelle glissante (30 j)
// =============================================================================

const prisma = require('../config/prisma');
const {
  getPlan,
  getLimits,
  getPeriodDays,
  TRIAL_DURATION_DAYS,
  QUOTA_WINDOW_DAYS,
} = require('../config/plans');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Récupère l'abonnement d'un établissement (ou null).
 */
async function getSubscription(etablissementId) {
  return prisma.subscription.findUnique({ where: { etablissementId } });
}

/**
 * Récupère l'abonnement, en créant un essai gratuit (TRIAL) s'il n'existe pas.
 */
async function getOrCreateTrial(etablissementId) {
  const existing = await getSubscription(etablissementId);
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      etablissementId,
      plan: 'TRIAL',
      statut: 'TRIAL',
      periode: 'MENSUEL',
      dateDebut: new Date(),
      dateFin: addDays(new Date(), TRIAL_DURATION_DAYS),
    },
  });
}

/**
 * Un abonnement est-il actif (essai ou payant non expiré) ?
 */
function isActive(sub) {
  if (!sub) return false;
  if (sub.statut === 'EXPIRE' || sub.statut === 'ANNULE') return false;
  return new Date(sub.dateFin).getTime() > Date.now();
}

/**
 * Met à jour le statut en base s'il est arrivé à expiration.
 * Retourne l'abonnement (éventuellement mis à jour).
 */
async function refreshStatus(sub) {
  if (!sub) return null;
  const expired = new Date(sub.dateFin).getTime() <= Date.now();
  if (expired && sub.statut !== 'EXPIRE' && sub.statut !== 'ANNULE') {
    return prisma.subscription.update({
      where: { id: sub.id },
      data: { statut: 'EXPIRE' },
    });
  }
  return sub;
}

/**
 * Usage courant de l'établissement.
 * Quota d'émission = certificats EMIS sur les 30 derniers jours (fenêtre glissante).
 */
async function getUsage(etablissementId, planId) {
  const windowStart = addDays(new Date(), -QUOTA_WINDOW_DAYS);

  const [certificatsUtilises, apprenantsLies, formations] = await Promise.all([
    prisma.certificat.count({
      where: {
        etablissementId,
        statut: 'EMIS',
        issuedAt: { gte: windowStart },
      },
    }),
    prisma.liaisonApprenantEtablissement.count({
      where: { etablissementId, statutLiaison: 'APPROUVE' },
    }),
    prisma.formation.count({ where: { etablissementId } }),
  ]);

  const limits = getLimits(planId);
  const limite = limits.certificatsParMois;

  return {
    certificats: {
      utilises: certificatsUtilises,
      limite, // null = illimité
      restant: limite === null ? null : Math.max(0, limite - certificatsUtilises),
      depasse: limite !== null && certificatsUtilises >= limite,
    },
    apprenants: { utilises: apprenantsLies, limite: limits.apprenants },
    formations: { utilises: formations, limite: limits.formations },
    fenetreJours: QUOTA_WINDOW_DAYS,
  };
}

/**
 * Active ou prolonge un abonnement payant après paiement confirmé.
 * - Si déjà actif : on prolonge à partir de la date de fin courante (cumul).
 * - Sinon : on démarre à maintenant.
 */
async function activateOrExtend(etablissementId, planId, periode, reference) {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Plan inconnu: ${planId}`);

  const periodeEnum = periode === 'annuel' ? 'ANNUEL' : 'MENSUEL';
  const days = getPeriodDays(periode);

  const current = await getSubscription(etablissementId);
  const now = new Date();

  // Point de départ de l'extension : fin courante si encore active, sinon maintenant
  const base =
    current && isActive(current) && new Date(current.dateFin) > now
      ? new Date(current.dateFin)
      : now;
  const newDateFin = addDays(base, days);

  if (current) {
    return prisma.subscription.update({
      where: { etablissementId },
      data: {
        plan: planId,
        statut: 'ACTIF',
        periode: periodeEnum,
        dateDebut: current.statut === 'EXPIRE' || current.statut === 'ANNULE' ? now : current.dateDebut,
        dateFin: newDateFin,
        annulationDemandee: false,
        derniereReference: reference || current.derniereReference,
      },
    });
  }

  return prisma.subscription.create({
    data: {
      etablissementId,
      plan: planId,
      statut: 'ACTIF',
      periode: periodeEnum,
      dateDebut: now,
      dateFin: newDateFin,
      derniereReference: reference || null,
    },
  });
}

/**
 * Job d'expiration : bascule en EXPIRE tous les abonnements dont la date de fin
 * est dépassée (TRIAL ou payant), et notifie l'établissement une seule fois.
 * Idempotent : ne re-traite pas un abonnement déjà EXPIRE/ANNULE.
 * Retourne le nombre d'abonnements expirés lors de ce passage.
 */
async function expireOverdue() {
  const now = new Date();
  const overdue = await prisma.subscription.findMany({
    where: {
      dateFin: { lte: now },
      statut: { notIn: ['EXPIRE', 'ANNULE'] },
    },
    select: { id: true, etablissementId: true, plan: true },
  });

  if (overdue.length === 0) return 0;

  await prisma.subscription.updateMany({
    where: { id: { in: overdue.map((s) => s.id) } },
    data: { statut: 'EXPIRE' },
  });

  // Notifications best-effort (chargées dynamiquement pour éviter les cycles)
  try {
    const { createNotification } = require('../utils/helpers');
    await Promise.all(
      overdue.map((s) =>
        createNotification({
          userId: s.etablissementId,
          userType: 'etablissement',
          type: 'ABONNEMENT_EXPIRE',
          titre: 'Abonnement expiré',
          message:
            "Votre abonnement a expiré. Renouvelez-le pour continuer à émettre des certificats.",
          important: true,
          lienAction: '/dashboard?userType=establishment',
          metadonnees: { plan: s.plan },
        }).catch(() => null)
      )
    );
  } catch (e) {
    console.error('⚠️ Notifications expiration échouées:', e.message);
  }

  return overdue.length;
}

// Délai au-delà duquel un paiement resté EN_ATTENTE est considéré comme abandonné.
const STALE_PENDING_MINUTES = 30;

/**
 * Nettoie les paiements restés EN_ATTENTE trop longtemps.
 * Avant d'échouer un paiement, on re-vérifie auprès de NotchPay :
 *  - s'il est finalement complété -> on active l'abonnement (filet de sécurité)
 *  - sinon -> on le marque ECHOUE.
 * Retourne le nombre de paiements marqués ECHOUE.
 */
async function expireStalePendingPayments() {
  const paymentService = require('./paymentService');
  const cutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000);

  const stale = await prisma.payment.findMany({
    where: { statut: 'EN_ATTENTE', createdAt: { lt: cutoff } },
  });
  if (stale.length === 0) return 0;

  let expired = 0;
  for (const p of stale) {
    try {
      const refToVerify = p.notchpayReference || p.reference;
      const v = await paymentService.verifyPayment(refToVerify);
      const status = (v.status || '').toLowerCase();

      if (v.success && (status === 'complete' || status === 'completed' || status === 'successful')) {
        const periodeNorm = p.periode === 'ANNUEL' ? 'annuel' : 'mensuel';
        const sub = await activateOrExtend(p.etablissementId, p.plan, periodeNorm, p.reference);
        await prisma.payment.update({
          where: { id: p.id },
          data: { statut: 'REUSSI', paidAt: new Date(), subscriptionId: sub.id },
        });
      } else {
        await prisma.payment.update({ where: { id: p.id }, data: { statut: 'ECHOUE' } });
        expired++;
      }
    } catch (e) {
      console.error('⚠️ expireStalePendingPayments:', e.message);
    }
  }
  return expired;
}

/**
 * Vue complète pour le dashboard établissement : abonnement + plan + usage.
 */
async function getSubscriptionSummary(etablissementId) {
  let sub = await getOrCreateTrial(etablissementId);
  sub = await refreshStatus(sub);
  const plan = getPlan(sub.plan);
  const usage = await getUsage(etablissementId, sub.plan);
  return {
    subscription: {
      plan: sub.plan,
      planName: plan ? plan.name : sub.plan,
      statut: sub.statut,
      periode: sub.periode,
      dateDebut: sub.dateDebut,
      dateFin: sub.dateFin,
      actif: isActive(sub),
      annulationDemandee: sub.annulationDemandee,
    },
    limits: getLimits(sub.plan),
    usage,
  };
}

module.exports = {
  getSubscription,
  getOrCreateTrial,
  isActive,
  refreshStatus,
  getUsage,
  activateOrExtend,
  getSubscriptionSummary,
  expireOverdue,
  expireStalePendingPayments,
  addDays,
};
