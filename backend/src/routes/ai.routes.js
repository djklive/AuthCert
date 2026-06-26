const express = require('express');

const prisma = require('../config/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const aiService = require('../services/aiService');
const { convertPdfFirstPageToPng } = require('../utils/pdfToImage');

const router = express.Router();

// ========================================
// ROUTES IA (Groq)
// ========================================

// Récupère les certificats émis d'un apprenant avec leur contexte.
async function getApprenantCertificats(apprenantId) {
  return prisma.certificat.findMany({
    where: { apprenantId, statut: 'EMIS' },
    orderBy: { dateObtention: 'desc' },
    select: {
      titre: true,
      mention: true,
      dateObtention: true,
      etablissement: { select: { nomEtablissement: true } },
      formation: {
        select: { nomFormation: true, typeFormation: true, niveauFormation: true }
      }
    }
  });
}

// Liste compacte des établissements actifs et de leurs formations (pour ancrer le chatbot).
async function getCatalogueEtablissements() {
  const etablissements = await prisma.etablissement.findMany({
    where: { statut: 'ACTIF' },
    select: {
      nomEtablissement: true,
      formations: {
        where: { statut: 'ACTIF' },
        select: { nomFormation: true, typeFormation: true, niveauFormation: true }
      }
    },
    take: 50
  });
  return etablissements.map((e) => ({
    etablissement: e.nomEtablissement,
    formations: e.formations.map((f) => f.nomFormation)
  }));
}

// Analyse du portefeuille de certificats de l'apprenant connecté
router.post('/api/ai/profile-analysis', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "L'assistant IA n'est pas configuré (clé GROQ_API_KEY manquante)."
      });
    }

    const apprenantId = req.user.id;
    const apprenant = await prisma.apprenant.findUnique({
      where: { id_apprenant: apprenantId },
      select: { nom: true, prenom: true }
    });

    if (!apprenant) {
      return res.status(404).json({ success: false, message: 'Apprenant introuvable' });
    }

    const certificats = await getApprenantCertificats(apprenantId);
    const analyse = await aiService.analyzeProfile({ apprenant, certificats });

    res.json({
      success: true,
      data: { ...analyse, nombreCertificats: certificats.length }
    });
  } catch (error) {
    console.error('❌ Erreur analyse profil IA:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'analyse du profil",
      error: error.message
    });
  }
});

// Chatbot d'aide de l'apprenant
router.post('/api/ai/chat', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "L'assistant IA n'est pas configuré (clé GROQ_API_KEY manquante)."
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages requis' });
    }

    const apprenantId = req.user.id;

    const [apprenant, certificats, catalogue] = await Promise.all([
      prisma.apprenant.findUnique({
        where: { id_apprenant: apprenantId },
        select: { nom: true, prenom: true }
      }),
      getApprenantCertificats(apprenantId),
      getCatalogueEtablissements()
    ]);

    const context = {
      apprenant: apprenant ? `${apprenant.prenom || ''} ${apprenant.nom || ''}`.trim() : null,
      mesCertificats: certificats.map((c) => ({
        titre: c.titre,
        mention: c.mention,
        etablissement: c.etablissement?.nomEtablissement || null,
        formation: c.formation?.nomFormation || null,
        date: c.dateObtention
      })),
      catalogueEtablissements: catalogue
    };

    const reply = await aiService.chatAssistant({ messages, context });

    res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('❌ Erreur chatbot IA:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la discussion avec l'assistant",
      error: error.message
    });
  }
});

// Numérisation OCR d'un diplôme + vérification de correspondance (établissement)
router.post(
  '/api/ai/ocr/diploma',
  authenticateToken,
  requireRole('establishment'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!aiService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: "L'OCR IA n'est pas configuré (clé GROQ_API_KEY manquante)."
        });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
      }

      // Le modèle vision n'accepte que des images : on accepte les images directement
      // et on convertit les PDF (1re page) en PNG au préalable.
      const mimetype = req.file.mimetype || '';
      const isImage = mimetype.startsWith('image/');
      const isPdf = mimetype === 'application/pdf';
      if (!isImage && !isPdf) {
        return res.status(400).json({
          success: false,
          message: "Format non supporté pour l'OCR : fournissez une image (JPG, PNG) ou un PDF."
        });
      }

      const { apprenantId, formationId } = req.body;
      const etablissementId = req.user.id;

      if (!apprenantId) {
        return res.status(400).json({ success: false, message: 'apprenantId requis' });
      }

      // Vérifier la liaison APPROUVE entre l'apprenant et cet établissement
      const liaison = await prisma.liaisonApprenantEtablissement.findFirst({
        where: {
          apprenantId: parseInt(apprenantId),
          etablissementId,
          statutLiaison: 'APPROUVE'
        }
      });

      if (!liaison) {
        return res.status(403).json({
          success: false,
          message: "Cet apprenant n'est pas lié (approuvé) à votre établissement."
        });
      }

      const apprenant = await prisma.apprenant.findUnique({
        where: { id_apprenant: parseInt(apprenantId) },
        select: { nom: true, prenom: true }
      });

      let formation = null;
      if (formationId) {
        formation = await prisma.formation.findFirst({
          where: { id: parseInt(formationId), etablissementId },
          select: { nomFormation: true }
        });
      }

      // Préparer une image pour le modèle vision (conversion du PDF si nécessaire)
      let imageBuffer = req.file.buffer;
      let imageMime = mimetype;
      if (isPdf) {
        try {
          imageBuffer = await convertPdfFirstPageToPng(req.file.buffer);
          imageMime = 'image/png';
        } catch (convErr) {
          console.error('❌ Erreur conversion PDF -> image:', convErr);
          return res.status(422).json({
            success: false,
            message: "Impossible de convertir ce PDF en image. Essayez avec une image (JPG, PNG)."
          });
        }
      }

      // Conversion en data URL base64 pour le modèle vision
      const base64DataUrl = `data:${imageMime};base64,${imageBuffer.toString('base64')}`;

      const extracted = await aiService.extractDiplomaData({ base64DataUrl });
      const match = aiService.computeMatchScore({ extracted, apprenant, formation });

      res.json({ success: true, data: { extracted, match } });
    } catch (error) {
      console.error('❌ Erreur OCR diplôme:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la numérisation du diplôme",
        error: error.message
      });
    }
  }
);

module.exports = router;
