const express = require('express');
const { v4: uuidv4 } = require('uuid');

const prisma = require('../config/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { PLANS, PAID_PLANS, CURRENCY, getPlan, getAmount } = require('../config/plans');
const subscriptionService = require('../services/subscriptionService');
const paymentService = require('../services/paymentService');
const { createNotification } = require('../utils/helpers');

const router = express.Router();

// ---------------------------------------------------------------------------
// Public : liste des plans (consommée par la page Tarif et les dashboards)
// ---------------------------------------------------------------------------
router.get('/api/plans', (req, res) => {
  res.json({ success: true, data: { currency: CURRENCY, plans: PLANS } });
});

// ---------------------------------------------------------------------------
// Établissement : son abonnement + usage
// ---------------------------------------------------------------------------
router.get('/api/subscription/me', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const summary = await subscriptionService.getSubscriptionSummary(req.user.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ Erreur récupération abonnement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Établissement : historique des paiements
// ---------------------------------------------------------------------------
router.get('/api/subscription/payments', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { etablissementId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('❌ Erreur historique paiements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Établissement : souscrire / renouveler (initialise un paiement NotchPay)
// body: { plan: 'PRO'|'EXCLUSIVE', periode: 'mensuel'|'annuel' }
// ---------------------------------------------------------------------------
router.post('/api/subscription/subscribe', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { plan, periode } = req.body;
    const periodeNorm = periode === 'annuel' ? 'annuel' : 'mensuel';

    if (!plan || !PAID_PLANS.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plan invalide' });
    }

    const amount = getAmount(plan, periodeNorm);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide pour ce plan' });
    }

    const etablissement = await prisma.etablissement.findUnique({
      where: { id_etablissement: req.user.id },
    });
    if (!etablissement) {
      return res.status(404).json({ success: false, message: 'Établissement introuvable' });
    }

    // Référence interne unique (idempotence + suivi)
    const reference = `SUB-${req.user.id}-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const planDef = getPlan(plan);

    // Trace du paiement (EN_ATTENTE) avant redirection
    const payment = await prisma.payment.create({
      data: {
        etablissementId: req.user.id,
        reference,
        montant: amount,
        devise: CURRENCY,
        plan,
        periode: periodeNorm === 'annuel' ? 'ANNUEL' : 'MENSUEL',
        statut: 'EN_ATTENTE',
      },
    });

    // Initialisation NotchPay
    const result = await paymentService.createPayment({
      amount,
      currency: CURRENCY,
      description: `Abonnement ${planDef.name} (${periodeNorm}) - ${etablissement.nomEtablissement}`,
      customerName: etablissement.nomResponsableEtablissement || etablissement.nomEtablissement,
      customerEmail: etablissement.emailEtablissement,
      customerPhone: etablissement.telephoneEtablissement || '',
      reference,
    });

    if (!result.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { statut: 'ECHOUE' },
      });
      return res.status(502).json({ success: false, message: 'Échec initialisation du paiement', error: result.error });
    }

    // Mémoriser la référence NotchPay + l'URL de paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        notchpayReference: result.transaction?.reference || null,
        paymentUrl: result.paymentUrl || null,
      },
    });

    res.json({
      success: true,
      data: {
        reference,
        paymentUrl: result.paymentUrl,
        amount,
        currency: CURRENCY,
        plan,
        periode: periodeNorm,
      },
    });
  } catch (error) {
    console.error('❌ Erreur souscription:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Confirme et applique un paiement à partir de NOTRE référence interne.
// Source de vérité = vérification via l'API NotchPay (jamais le client seul).
// Utilisé au retour de redirection et par le webhook.
// ---------------------------------------------------------------------------
async function confirmPaymentByReference(internalReference) {
  const payment = await prisma.payment.findUnique({ where: { reference: internalReference } });
  if (!payment) return { ok: false, reason: 'PAYMENT_NOT_FOUND' };

  // Déjà traité -> idempotent
  if (payment.statut === 'REUSSI') return { ok: true, alreadyApplied: true, payment };

  const refToVerify = payment.notchpayReference || payment.reference;
  const verification = await paymentService.verifyPayment(refToVerify);

  if (!verification.success) {
    return { ok: false, reason: 'VERIFY_FAILED', error: verification.error };
  }

  const status = (verification.status || '').toLowerCase();
  if (status !== 'complete' && status !== 'completed' && status !== 'successful') {
    return { ok: false, reason: 'NOT_COMPLETE', status };
  }

  // Activer / prolonger l'abonnement
  const periodeNorm = payment.periode === 'ANNUEL' ? 'annuel' : 'mensuel';
  const subscription = await subscriptionService.activateOrExtend(
    payment.etablissementId,
    payment.plan,
    periodeNorm,
    payment.reference
  );

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { statut: 'REUSSI', paidAt: new Date(), subscriptionId: subscription.id },
  });

  // Notifier l'établissement
  try {
    await createNotification({
      userId: payment.etablissementId,
      userType: 'etablissement',
      type: 'ABONNEMENT_RENOUVELE',
      titre: 'Abonnement activé',
      message: `Votre abonnement ${payment.plan} est actif jusqu'au ${new Date(subscription.dateFin).toLocaleDateString('fr-FR')}.`,
      important: true,
      lienAction: '/dashboard?userType=establishment',
      metadonnees: { plan: payment.plan, reference: payment.reference },
    });
  } catch (e) {
    console.error('⚠️ Notification abonnement échouée:', e.message);
  }

  return { ok: true, payment: updatedPayment, subscription };
}

// ---------------------------------------------------------------------------
// Établissement : vérifier un paiement au retour de redirection
// ---------------------------------------------------------------------------
router.get('/api/subscription/verify/:reference', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const result = await confirmPaymentByReference(req.params.reference);
    if (!result.ok) {
      return res.status(202).json({ success: false, pending: true, ...result });
    }
    res.json({ success: true, data: { applied: true, alreadyApplied: !!result.alreadyApplied } });
  } catch (error) {
    console.error('❌ Erreur vérification paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Webhook NotchPay (appelé par NotchPay côté serveur)
// On ne fait JAMAIS confiance au corps : on re-vérifie via l'API NotchPay.
// ---------------------------------------------------------------------------
router.post('/api/payments/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = payload.data || payload;
    const notchRef = data.reference || data.trxref || null;
    const merchantRef = data.merchant_reference || data.reference || null;

    // Retrouver notre paiement par référence interne ou référence NotchPay
    let payment = null;
    if (merchantRef) {
      payment = await prisma.payment.findUnique({ where: { reference: merchantRef } }).catch(() => null);
    }
    if (!payment && notchRef) {
      payment = await prisma.payment.findFirst({ where: { notchpayReference: notchRef } });
    }

    if (!payment) {
      // On répond 200 pour éviter les retJ inutiles ; rien à appliquer
      return res.status(200).json({ received: true, applied: false });
    }

    const result = await confirmPaymentByReference(payment.reference);
    return res.status(200).json({ received: true, applied: !!result.ok });
  } catch (error) {
    console.error('❌ Erreur webhook NotchPay:', error);
    // 200 pour éviter des relances en boucle ; on a loggé l'erreur
    return res.status(200).json({ received: true, applied: false });
  }
});

// ===========================================================================
//                              ADMIN
// ===========================================================================

// Liste de tous les abonnements
router.get('/api/admin/subscriptions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      orderBy: { dateFin: 'asc' },
      include: {
        etablissement: {
          select: { id_etablissement: true, nomEtablissement: true, emailEtablissement: true, statut: true },
        },
      },
    });
    res.json({ success: true, data: subs });
  } catch (error) {
    console.error('❌ Erreur liste abonnements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Statistiques (revenus + répartition)
router.get('/api/admin/subscriptions/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [revenueAgg, paymentsCount, byStatut, byPlan, failedCount] = await Promise.all([
      prisma.payment.aggregate({ _sum: { montant: true }, where: { statut: 'REUSSI' } }),
      prisma.payment.count({ where: { statut: 'REUSSI' } }),
      prisma.subscription.groupBy({ by: ['statut'], _count: { _all: true } }),
      prisma.subscription.groupBy({ by: ['plan'], _count: { _all: true } }),
      prisma.payment.count({ where: { statut: 'ECHOUE' } }),
    ]);

    res.json({
      success: true,
      data: {
        currency: CURRENCY,
        revenuTotal: revenueAgg._sum.montant || 0,
        paiementsReussis: paymentsCount,
        paiementsEchoues: failedCount,
        parStatut: byStatut.map((s) => ({ statut: s.statut, count: s._count._all })),
        parPlan: byPlan.map((p) => ({ plan: p.plan, count: p._count._all })),
      },
    });
  } catch (error) {
    console.error('❌ Erreur stats abonnements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Override manuel d'un abonnement (geste commercial / correction)
// body: { plan, periode: 'mensuel'|'annuel', jours? }
router.post('/api/admin/subscriptions/:etablissementId/override', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const etablissementId = parseInt(req.params.etablissementId);
    const { plan, periode } = req.body;

    if (!getPlan(plan)) {
      return res.status(400).json({ success: false, message: 'Plan invalide' });
    }

    const subscription = await subscriptionService.activateOrExtend(
      etablissementId,
      plan,
      periode === 'annuel' ? 'annuel' : 'mensuel',
      `ADMIN-OVERRIDE-${Date.now()}`
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('❌ Erreur override abonnement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
