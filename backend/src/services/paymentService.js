const NotchPay = require('notchpay');

// Configuration Notch Pay
const notchpay = new NotchPay({
  publicKey: process.env.NOTCH_PAY_PUBLIC_KEY,
  secretKey: process.env.NOTCH_PAY_SECRET_KEY,
});

/**
 * Créer une transaction de paiement Notch Pay
 * @param {Object} paymentData - Données du paiement
 * @returns {Promise<Object>} Résultat de la transaction
 */
async function createPayment(paymentData) {
  try {
    const transaction = await notchpay.transaction.initialize({
      amount: paymentData.amount,
      currency: paymentData.currency || 'XOF', // Franc CFA par défaut
      description: paymentData.description,
      customer: {
        name: paymentData.customerName,
        email: paymentData.customerEmail,
        phone: paymentData.customerPhone || '',
      },
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      webhook_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      reference: paymentData.reference, // ID unique pour tracking
    });

    return {
      success: true,
      transaction: transaction.data,
      paymentUrl: transaction.data.authorization_url,
    };
  } catch (error) {
    console.error('❌ Erreur création paiement Notch Pay:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Vérifier le statut d'une transaction Notch Pay
 * @param {string} reference - Référence de la transaction
 * @returns {Promise<Object>} Statut de la transaction
 */
async function verifyPayment(reference) {
  try {
    const transaction = await notchpay.transaction.verify(reference);
    return {
      success: true,
      status: transaction.data.status,
      transaction: transaction.data,
    };
  } catch (error) {
    console.error('❌ Erreur vérification paiement:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Note (modèle relayer) : il n'y a plus de transfert de MATIC vers les
// établissements. Le wallet relayer (trésorerie plateforme) paie le gas
// directement ; son solde est exposé via blockchainService.getRelayerInfo().

module.exports = {
  createPayment,
  verifyPayment,
};






