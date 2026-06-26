// ===============================================
//                SERVICE IA (Groq)
// API compatible OpenAI. Couvre le chatbot, l'analyse
// de profil et l'OCR des diplômes (modèle vision).
// Variables d'env requises :
//   - GROQ_API_KEY        (obligatoire)
//   - GROQ_MODEL          (défaut llama-3.3-70b-versatile)
//   - GROQ_VISION_MODEL   (défaut meta-llama/llama-4-scout-17b-16e-instruct)
// ===============================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_TEXT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const DEFAULT_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

function isConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Appel générique vers l'API de complétion de chat Groq.
 * @param {Array<{role: string, content: any}>} messages
 * @param {{ model?: string, temperature?: number, json?: boolean, maxTokens?: number }} [options]
 * @returns {Promise<string>} le contenu textuel de la réponse de l'assistant
 */
async function chatCompletion(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('Configuration IA incomplète : la variable GROQ_API_KEY est absente.');
  }

  const {
    model = DEFAULT_TEXT_MODEL,
    temperature = 0.4,
    json = false,
    maxTokens = 1024
  } = options;

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };
  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`❌ Erreur Groq (HTTP ${response.status}):`, detail);
    throw new Error(`Groq HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    // Tente d'isoler un objet JSON noyé dans du texte.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Analyse le portefeuille de certificats d'un apprenant et génère
 * un résumé de profil + des recommandations de progression.
 * @param {{ apprenant: { nom: string, prenom: string }, certificats: Array, formations: Array }} params
 * @returns {Promise<{ resumeProfil: string, posteCible: string, certificationsRecommandees: string[], domaines: string[] }>}
 */
async function analyzeProfile({ apprenant, certificats }) {
  const nomComplet = `${apprenant.prenom || ''} ${apprenant.nom || ''}`.trim();

  const certifsResume = (certificats || []).map((c) => ({
    titre: c.titre,
    mention: c.mention || null,
    formation: c.formation?.nomFormation || null,
    typeFormation: c.formation?.typeFormation || null,
    niveau: c.formation?.niveauFormation || null,
    etablissement: c.etablissement?.nomEtablissement || null,
    date: c.dateObtention
  }));

  const systemPrompt = [
    "Tu es un conseiller d'orientation et de carrière expert pour la plateforme AuthCert.",
    "Tu analyses le portefeuille de certificats d'un apprenant et tu réponds STRICTEMENT en JSON.",
    "Réponds en français, de manière concise, professionnelle et encourageante.",
    "Le JSON doit avoir exactement cette forme :",
    '{',
    '  "resumeProfil": "2 à 4 phrases résumant le profil et les domaines couverts",',
    '  "posteCible": "un intitulé de poste correspondant au profil",',
    '  "domaines": ["domaine1", "domaine2"],',
    '  "certificationsRecommandees": ["certif 1 avec courte justification", "certif 2", "certif 3"]',
    '}',
    "Si l'apprenant n'a aucun certificat, propose un démarrage de parcours générique."
  ].join('\n');

  const userPrompt = [
    `Apprenant : ${nomComplet || 'Inconnu'}`,
    `Nombre de certificats : ${certifsResume.length}`,
    `Certificats (JSON) : ${JSON.stringify(certifsResume)}`
  ].join('\n');

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: true, temperature: 0.5, maxTokens: 900 }
  );

  const parsed = safeParseJson(content) || {};
  return {
    resumeProfil: parsed.resumeProfil || "Profil en cours de construction.",
    posteCible: parsed.posteCible || '',
    domaines: Array.isArray(parsed.domaines) ? parsed.domaines : [],
    certificationsRecommandees: Array.isArray(parsed.certificationsRecommandees)
      ? parsed.certificationsRecommandees
      : []
  };
}

// Base de connaissances FAQ pour ancrer le chatbot.
const FAQ_KNOWLEDGE = `
CONNAISSANCES PLATEFORME AUTHCERT :
- AuthCert est une plateforme de certification de diplômes sécurisée par la blockchain (Polygon).
- Chaque certificat émis possède une empreinte (hash SHA-256) enregistrée sur la blockchain, un PDF officiel et un QR code de vérification.
- Partager un certificat sur LinkedIn : télécharger le PDF depuis "Mes certificats", ou copier le lien public de vérification (bouton Partage) et l'ajouter dans la section "Licences et certifications" de LinkedIn, ou publier le QR code.
- Un employeur qui doute de la validité : il peut scanner le QR code ou ouvrir le lien public de vérification ; la plateforme confirme l'authenticité en comparant le hash avec la blockchain. Si un employeur dit que le certificat est invalide, vérifier que le certificat a bien le statut "Émis", repartager le lien public officiel, et contacter l'établissement émetteur en cas de doute persistant.
- L'apprenant ne peut pas créer lui-même un certificat : seul un établissement validé peut émettre. L'apprenant peut faire une "Demande de certificat" à un établissement auquel il est lié.
- Pour trouver une formation (ex : cybersécurité), consulter la liste des établissements et de leurs formations fournie dans le contexte ci-dessous.
`;

/**
 * Conversation avec l'assistant étudiant, ancrée sur les données réelles.
 * @param {{ messages: Array<{role: string, content: string}>, context: object }} params
 * @returns {Promise<string>}
 */
async function chatAssistant({ messages, context }) {
  const systemPrompt = [
    "Tu es l'assistant personnel de carrière de la plateforme AuthCert.",
    "Tu aides les apprenants : partage de certificats, vérification, orientation, recherche de formations.",
    "Réponds en français, de façon claire, concise et bienveillante. Utilise des listes courtes si utile.",
    "Base-toi en priorité sur les données réelles de contexte fournies. Ne fabrique pas d'information.",
    "Si une donnée n'est pas disponible, dis-le honnêtement et propose une action concrète.",
    FAQ_KNOWLEDGE,
    'CONTEXTE UTILISATEUR (JSON) :',
    JSON.stringify(context || {})
  ].join('\n');

  const safeMessages = (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12);

  return chatCompletion(
    [{ role: 'system', content: systemPrompt }, ...safeMessages],
    { temperature: 0.6, maxTokens: 800 }
  );
}

/**
 * Extraction OCR des informations d'un diplôme via le modèle vision.
 * @param {{ base64DataUrl: string }} params  data URL complète (data:<mime>;base64,...)
 * @returns {Promise<{ nomComplet: string|null, titre: string|null, mention: string|null, dateObtention: string|null, etablissement: string|null, texteBrut: string|null }>}
 */
async function extractDiplomaData({ base64DataUrl }) {
  const instruction = [
    "Tu es un moteur d'extraction de données de diplômes/certificats.",
    "Analyse l'image fournie et renvoie STRICTEMENT un JSON avec cette forme :",
    '{',
    '  "nomComplet": "nom complet du titulaire ou null",',
    '  "titre": "intitulé du diplôme/certificat ou null",',
    '  "mention": "mention/note ou null",',
    '  "dateObtention": "date au format YYYY-MM-DD ou null",',
    '  "etablissement": "nom de l\'établissement émetteur ou null",',
    '  "texteBrut": "le texte principal lisible sur le document"',
    '}',
    "N'invente aucune valeur : mets null si l'information est absente ou illisible."
  ].join('\n');

  const content = await chatCompletion(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: base64DataUrl } }
        ]
      }
    ],
    { model: DEFAULT_VISION_MODEL, json: true, temperature: 0.1, maxTokens: 1024 }
  );

  const parsed = safeParseJson(content) || {};
  return {
    nomComplet: parsed.nomComplet || null,
    titre: parsed.titre || null,
    mention: parsed.mention || null,
    dateObtention: parsed.dateObtention || null,
    etablissement: parsed.etablissement || null,
    texteBrut: parsed.texteBrut || null
  };
}

// ---- Correspondance floue (sans dépendance externe) ----

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalize(str).split(' ').filter((t) => t.length > 1);
}

/**
 * Score de chevauchement de tokens entre deux chaînes (0..1).
 */
function tokenOverlapScore(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  const common = ta.filter((t) => setB.has(t)).length;
  return common / Math.max(ta.length, tb.length);
}

/**
 * Calcule un score de correspondance entre les données extraites,
 * l'apprenant sélectionné et la formation choisie.
 * @returns {{ scoreNom: number, scoreFormation: number, ok: boolean, details: object }}
 */
function computeMatchScore({ extracted, apprenant, formation }) {
  const nomAttendu = `${apprenant?.prenom || ''} ${apprenant?.nom || ''}`.trim();
  const scoreNom = tokenOverlapScore(extracted?.nomComplet || '', nomAttendu);

  const formationAttendue = formation?.nomFormation || '';
  const scoreTitreVsFormation = tokenOverlapScore(extracted?.titre || '', formationAttendue);
  const scoreTexteVsFormation = tokenOverlapScore(extracted?.texteBrut || '', formationAttendue);
  const scoreFormation = Math.max(scoreTitreVsFormation, scoreTexteVsFormation);

  // Seuils volontairement souples (vérification = avertissement, pas blocage strict).
  const NOM_SEUIL = 0.4;
  const FORMATION_SEUIL = 0.25;
  const ok = scoreNom >= NOM_SEUIL && scoreFormation >= FORMATION_SEUIL;

  return {
    scoreNom: Math.round(scoreNom * 100) / 100,
    scoreFormation: Math.round(scoreFormation * 100) / 100,
    ok,
    details: {
      nomAttendu,
      nomExtrait: extracted?.nomComplet || null,
      formationAttendue,
      titreExtrait: extracted?.titre || null,
      seuils: { nom: NOM_SEUIL, formation: FORMATION_SEUIL }
    }
  };
}

module.exports = {
  isConfigured,
  chatCompletion,
  analyzeProfile,
  chatAssistant,
  extractDiplomaData,
  computeMatchScore
};
