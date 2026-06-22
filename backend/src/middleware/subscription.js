// =============================================================================
// Middlewares de contrôle d'abonnement (établissements).
// À placer APRÈS authenticateToken + requireRole('establishment').
// =============================================================================

const subscriptionService = require('../services/subscriptionService');

/**
 * Exige un abonnement actif (essai ou payant non expiré).
 * Crée automatiquement l'essai gratuit s'il n'existe pas encore.
 */
async function requireActiveSubscription(req, res, next) {
  try {
    const etablissementId = req.user.id;
    let sub = await subscriptionService.getOrCreateTrial(etablissementId);
    sub = await subscriptionService.refreshStatus(sub);

    if (!subscriptionService.isActive(sub)) {
      return res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message:
          "Votre abonnement a expiré. Renouvelez votre abonnement pour continuer à émettre des certificats.",
        data: { plan: sub.plan, statut: sub.statut, dateFin: sub.dateFin },
      });
    }

    req.subscription = sub;
    next();
  } catch (error) {
    console.error('❌ Erreur vérification abonnement:', error);
    res.status(500).json({ success: false, message: 'Erreur vérification abonnement' });
  }
}

/**
 * Vérifie que le quota d'émission (fenêtre mensuelle glissante) n'est pas atteint.
 * Suppose que req.subscription est déjà défini (requireActiveSubscription en amont).
 */
async function checkEmissionQuota(req, res, next) {
  try {
    const etablissementId = req.user.id;
    const sub = req.subscription || (await subscriptionService.getOrCreateTrial(etablissementId));
    const usage = await subscriptionService.getUsage(etablissementId, sub.plan);

    if (usage.certificats.depasse) {
      return res.status(403).json({
        success: false,
        code: 'QUOTA_EXCEEDED',
        message: `Quota d'émission atteint (${usage.certificats.limite} certificats / ${usage.fenetreJours} jours pour le plan ${sub.plan}). Passez à un plan supérieur pour émettre davantage.`,
        data: usage.certificats,
      });
    }

    req.subscriptionUsage = usage;
    next();
  } catch (error) {
    console.error('❌ Erreur vérification quota:', error);
    res.status(500).json({ success: false, message: 'Erreur vérification quota' });
  }
}

module.exports = { requireActiveSubscription, checkEmissionQuota };
