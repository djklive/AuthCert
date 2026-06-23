// =============================================================================
// Intégration NotchPay via l'API REST officielle (https://api.notchpay.co).
// On n'utilise pas le SDK npm (build orienté navigateur, API instable) :
// on appelle directement les endpoints avec fetch (Node >= 18).
//
// Auth : la clé PUBLIQUE (pk....) va dans l'en-tête `Authorization`.
// La clé SECRÈTE (sk....) n'est requise que pour certaines opérations
// privilégiées (en-tête `X-Grant`) — pas pour initialize/verify.
// =============================================================================

const NOTCHPAY_BASE = process.env.NOTCHPAY_BASE_URL || 'https://api.notchpay.co';

const PUBLIC_KEY = process.env.NOTCH_PAY_PUBLIC_KEY || process.env.NOTCHPAY_PUBLIC_KEY || '';
const SECRET_KEY = process.env.NOTCH_PAY_SECRET_KEY || process.env.NOTCHPAY_SECRET_KEY || '';

function cleanUrl(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

function authHeaders(extra = {}) {
  return {
    Authorization: PUBLIC_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

/**
 * Initialise une transaction de paiement NotchPay (hosted checkout).
 * @returns {Promise<{success:boolean, transaction?:object, paymentUrl?:string, error?:string}>}
 */
async function createPayment(paymentData) {
  if (!PUBLIC_KEY) {
    return { success: false, error: 'NOTCH_PAY_PUBLIC_KEY manquant dans la configuration serveur' };
  }

  try {
    const callbackUrl = `${cleanUrl(process.env.FRONTEND_URL)}/payment/callback`;

    const body = {
      amount: paymentData.amount,
      currency: paymentData.currency || 'XAF',
      description: paymentData.description,
      reference: paymentData.reference,
      callback: callbackUrl,
      // Infos client (NotchPay accepte les champs au niveau racine)
      email: paymentData.customerEmail,
      name: paymentData.customerName,
      phone: paymentData.customerPhone || undefined,
    };

    const response = await fetch(`${NOTCHPAY_BASE}/payments/initialize`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error || `HTTP ${response.status}`;
      console.error('❌ Erreur initialisation NotchPay:', message, data);
      return { success: false, error: message };
    }

    const transaction = data.transaction || data.data?.transaction || data.data || {};
    const paymentUrl = data.authorization_url || data.data?.authorization_url || transaction.authorization_url;

    if (!paymentUrl) {
      console.error('❌ NotchPay: authorization_url absent de la réponse', data);
      return { success: false, error: "URL de paiement absente de la réponse NotchPay" };
    }

    return { success: true, transaction, paymentUrl };
  } catch (error) {
    console.error('❌ Erreur création paiement NotchPay:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Charge directe Mobile Money : déclenche le push USSD sur le téléphone du client.
 * À appeler APRÈS createPayment (qui fournit la référence de transaction NotchPay).
 * @param {string} reference - Référence NotchPay de la transaction (trx....).
 * @param {string} channel   - Canal NotchPay : 'cm.mtn' | 'cm.orange' | 'cm.mobile'.
 * @param {string} phone     - Numéro Mobile Money du client (format +237XXXXXXXX).
 * @returns {Promise<{success:boolean, status?:string, transaction?:object, error?:string}>}
 */
async function chargeMobileMoney(reference, channel, phone) {
  if (!PUBLIC_KEY) {
    return { success: false, error: 'NOTCH_PAY_PUBLIC_KEY manquant dans la configuration serveur' };
  }

  try {
    const response = await fetch(`${NOTCHPAY_BASE}/payments/${encodeURIComponent(reference)}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ channel, data: { phone } }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error || `HTTP ${response.status}`;
      console.error('❌ Erreur charge Mobile Money NotchPay:', message, data);
      return { success: false, error: message, data };
    }

    const transaction = data.transaction || data.data?.transaction || data.data || {};
    return { success: true, status: transaction.status, transaction, raw: data };
  } catch (error) {
    console.error('❌ Erreur charge Mobile Money NotchPay:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie le statut d'une transaction NotchPay.
 * @param {string} reference - Référence NotchPay (ou marchande) de la transaction.
 * @returns {Promise<{success:boolean, status?:string, transaction?:object, error?:string}>}
 */
async function verifyPayment(reference) {
  if (!PUBLIC_KEY) {
    return { success: false, error: 'NOTCH_PAY_PUBLIC_KEY manquant dans la configuration serveur' };
  }

  try {
    const response = await fetch(`${NOTCHPAY_BASE}/payments/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error || `HTTP ${response.status}`;
      console.error('❌ Erreur vérification NotchPay:', message, data);
      return { success: false, error: message };
    }

    const transaction = data.transaction || data.data?.transaction || data.data || {};
    return { success: true, status: transaction.status, transaction };
  } catch (error) {
    console.error('❌ Erreur vérification paiement NotchPay:', error);
    return { success: false, error: error.message };
  }
}

// Note (modèle relayer) : il n'y a plus de transfert de MATIC vers les
// établissements. Le wallet relayer (trésorerie plateforme) paie le gas
// directement ; son solde est exposé via blockchainService.getRelayerInfo().

module.exports = {
  createPayment,
  chargeMobileMoney,
  verifyPayment,
  SECRET_KEY,
};
