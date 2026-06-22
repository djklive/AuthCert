const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const prisma = require('../config/prisma');
const supabaseStorage = require('./storageService');
const { sha256Hex } = require('../utils/cryptoUtils');

// Fonction pour récupérer le logo de l'établissement
async function getEstablishmentLogo(etablissementId) {
  try {
    // Récupérer le document logo de l'établissement
    const logoDocument = await prisma.documentEtablissement.findFirst({
      where: {
        etablissementId: etablissementId,
        typeDocument: 'LOGO_ETABLISSEMENT',
        statut: 'VALIDE'
      }
    });

    if (logoDocument && logoDocument.cheminFichier) {
      // Vérifier si c'est déjà une URL publique ou un chemin de fichier
      if (logoDocument.cheminFichier.startsWith('http')) {
        console.log(`✅ Logo URL publique trouvée: ${logoDocument.cheminFichier}`);
        return logoDocument.cheminFichier; // URL publique directe
      } else {
        // Récupérer l'URL signée depuis Supabase pour les chemins de fichiers
        const result = await supabaseStorage.getSignedUrl(logoDocument.cheminFichier);

        if (result.success) {
          console.log(`✅ Logo URL signée générée: ${result.url}`);
          return result.url;
        } else {
          console.log(`❌ Erreur URL signée logo: ${result.error}`);
          return null;
        }
      }
    }

    console.log(`ℹ️ Aucun logo trouvé pour l'établissement ${etablissementId}`);
    return null;
  } catch (error) {
    console.error('❌ Erreur récupération logo:', error);
    return null;
  }
}

async function generateCertificatePdf({
  certificat,
  apprenant,
  etablissement,
  formation,
  verifyBaseUrl
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const uuid = certificat.uuid;
      const fileName = `${uuid}.pdf`;

      // QR vers la page publique de vérification
      const verifyUrl = `${verifyBaseUrl}?uuid=${encodeURIComponent(uuid)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        margin: 2,
        width: 200,
        color: {
          dark: '#1f2937',  // Gris foncé
          light: '#ffffff'  // Blanc
        }
      });

      // Récupérer le logo de l'établissement
      let logoUrl = null;
      try {
        logoUrl = await getEstablishmentLogo(etablissement.id_etablissement);
        console.log(`🖼️ Logo URL: ${logoUrl || 'Aucun logo'}`);
      } catch (logoError) {
        console.warn('⚠️ Erreur récupération logo, utilisation du placeholder:', logoError.message);
        logoUrl = null;
      }

      // Configuration du document PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Certificat - ${certificat.titre}`,
          Author: etablissement.nomEtablissement,
          Subject: formation ? formation.nomFormation : 'Certificat de formation',
          Creator: 'AuthCert Platform'
        }
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const hashHex = sha256Hex(pdfBuffer);

          // Upload vers Supabase Storage
          const uploadResult = await supabaseStorage.uploadFile(
            pdfBuffer,
            fileName,
            'certificats',
            'application/pdf'
          );

          if (!uploadResult.success) {
            throw new Error(`Erreur upload Supabase: ${uploadResult.error}`);
          }

          console.log(`✅ PDF généré et uploadé: ${uploadResult.url}`);
          resolve({
            filePath: uploadResult.path,
            publicUrl: uploadResult.url,
            hashHex
          });

        } catch (error) {
          console.error('❌ Erreur upload PDF:', error);
          console.error('❌ Erreur upload PDF:', error.message);
          console.error('❌ Erreur upload PDF:', error.stack);
          console.error('❌ Erreur upload PDF:', error.code);
          console.error('❌ Erreur upload PDF:', error.details);
          console.error('❌ Erreur upload PDF:', error.hint);
          reject(error);
        }
      });

      // ===========================================
      // DESIGN PROFESSIONNEL DU CERTIFICAT
      // ===========================================

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 60;

      // Couleurs de la marque
      const primaryColor = '#F43F5E';  // Rose principal
      const secondaryColor = '#1f2937'; // Gris foncé
      const accentColor = '#6b7280';   // Gris moyen
      const lightGray = '#f9fafb';     // Gris très clair

      // ===========================================
      // ARRIÈRE-PLAN ET BORDURE
      // ===========================================

      // Bordure décorative
      doc.rect(margin - 10, margin - 10, pageWidth - 2 * margin + 20, pageHeight - 2 * margin + 20)
         .lineWidth(3)
         .stroke(primaryColor);

      // Bordure intérieure
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
         .lineWidth(1)
         .stroke(accentColor);

      // ===========================================
      // EN-TÊTE AVEC LOGO
      // ===========================================

      const headerY = margin + 30;

      // Logo de l'établissement
      if (logoUrl) {
        try {
          console.log(`🔄 Téléchargement du logo: ${logoUrl}`);
          // Télécharger le logo depuis Supabase
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            const logoBuffer = Buffer.from(logoArrayBuffer);
            doc.image(logoBuffer, pageWidth / 2 - 30, headerY - 10, { width: 60, height: 60 });
            console.log(`✅ Logo chargé avec succès`);
          } else {
            throw new Error(`Logo non accessible: ${logoResponse.status} ${logoResponse.statusText}`);
          }
        } catch (error) {
          console.warn('⚠️ Impossible de charger le logo, utilisation du placeholder:', error.message);
          // Fallback vers le placeholder
          doc.circle(pageWidth / 2, headerY + 20, 30)
             .fill(primaryColor);

          doc.fontSize(16)
             .fillColor('white')
             .text('🏆', pageWidth / 2 - 15, headerY + 5, { width: 30, align: 'center' });
        }
      } else {
        console.log(`ℹ️ Aucun logo fourni, utilisation du placeholder`);
        // Placeholder par défaut
        doc.circle(pageWidth / 2, headerY + 20, 30)
           .fill(primaryColor);

        doc.fontSize(16)
           .fillColor('white')
           .text('🏆', pageWidth / 2 - 15, headerY + 5, { width: 30, align: 'center' });
      }

      // Nom de l'établissement
      doc.fontSize(18)
         .fillColor(secondaryColor)
         .text(etablissement.nomEtablissement, margin, headerY + 60, {
           width: pageWidth - 2 * margin,
           align: 'center',
           lineGap: 2
         });

      // Ligne de séparation
      doc.moveTo(margin + 50, headerY + 100)
         .lineTo(pageWidth - margin - 50, headerY + 100)
         .lineWidth(2)
         .stroke(primaryColor);

      // ===========================================
      // TITRE PRINCIPAL
      // ===========================================

      const titleY = headerY + 130;

      doc.fontSize(12)
         .fillColor(accentColor)
         .text(formation.nomFormation, margin, titleY, {
           width: pageWidth - 2 * margin,
           align: 'center'
         });

      doc.fontSize(28)
         .fillColor(secondaryColor)
         .text(certificat.titre, margin, titleY + 20, {
           width: pageWidth - 2 * margin,
           align: 'center',
           lineGap: 5
         });

      // ===========================================
      // NOM DU RÉCIPIENDAIRE
      // ===========================================

      const recipientY = titleY + 100;

      doc.fontSize(14)
         .fillColor(accentColor)
         .text('Décerné à', margin, recipientY, {
           width: pageWidth - 2 * margin,
           align: 'center'
         });

      doc.fontSize(24)
         .fillColor(primaryColor)
         .text(`${apprenant.prenom} ${apprenant.nom}`, margin, recipientY + 25, {
           width: pageWidth - 2 * margin,
           align: 'center',
           lineGap: 3
         });

      // ===========================================
      // DÉTAILS DU CERTIFICAT
      // ===========================================

      const detailsY = recipientY + 80;
      const detailsWidth = (pageWidth - 2 * margin) / 2;

      // Colonne gauche
      doc.fontSize(12)
         .fillColor(secondaryColor)
         .text('Date d\'obtention:', margin, detailsY)
         .text(new Date(certificat.dateObtention).toLocaleDateString('fr-FR', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         }), margin + 130, detailsY);

      if (certificat.mention) {
        doc.text('Mention:', margin, detailsY + 25)
           .text(certificat.mention, margin + 130, detailsY + 25);
      }

      // Colonne droite - QR Code
      const qrX = pageWidth - margin - 120;
      const qrY = detailsY - 10;

      // Intégrer le QR code
      const qrBase64 = qrDataUrl.replace(/^data:image\/(png|jpg);base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

      // Texte sous le QR
      doc.fontSize(8)
         .fillColor(accentColor)
         .text('Vérifiez l\'authenticité', qrX, qrY + 105, { width: 100, align: 'center' })
         .text('en scannant ce code', qrX, qrY + 115, { width: 100, align: 'center' });

      // ===========================================
      // FOOTER
      // ===========================================

      const footerY = pageHeight - margin - 80;

      // Ligne de séparation
      doc.moveTo(margin + 50, footerY - 20)
         .lineTo(pageWidth - margin - 50, footerY - 20)
         .lineWidth(1)
         .stroke(accentColor);

      // Informations de vérification
      doc.fontSize(8)
         .fillColor(accentColor)
         .text(`Identifiant unique: ${uuid}`, margin, footerY, { width: pageWidth - 2 * margin, align: 'center' })
         .text(`Vérification: ${verifyUrl}`, margin, footerY + 12, { width: pageWidth - 2 * margin, align: 'center' })
         .text('Ce certificat est sécurisé par la technologie blockchain', margin, footerY + 24, { width: pageWidth - 2 * margin, align: 'center' })
         .text('© 2025 AuthCert Platform - Tous droits réservés', margin, footerY + 36, { width: pageWidth - 2 * margin, align: 'center' });

      // ===========================================
      // ÉLÉMENTS DÉCORATIFS
      // ===========================================

      // Coins décoratifs
      const cornerSize = 20;
      const cornerThickness = 3;

      // Coin supérieur gauche
      doc.moveTo(margin, margin + cornerSize)
         .lineTo(margin, margin)
         .lineTo(margin + cornerSize, margin)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);

      // Coin supérieur droit
      doc.moveTo(pageWidth - margin - cornerSize, margin)
         .lineTo(pageWidth - margin, margin)
         .lineTo(pageWidth - margin, margin + cornerSize)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);

      // Coin inférieur gauche
      doc.moveTo(margin, pageHeight - margin - cornerSize)
         .lineTo(margin, pageHeight - margin)
         .lineTo(margin + cornerSize, pageHeight - margin)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);

      // Coin inférieur droit
      doc.moveTo(pageWidth - margin - cornerSize, pageHeight - margin)
         .lineTo(pageWidth - margin, pageHeight - margin)
         .lineTo(pageWidth - margin, pageHeight - margin - cornerSize)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);

      doc.end();

    } catch (e) {
      reject(e);
      console.error('❌ Erreur génération PDF:', e);
    }
  });
}

module.exports = {
  getEstablishmentLogo,
  generateCertificatePdf
};
