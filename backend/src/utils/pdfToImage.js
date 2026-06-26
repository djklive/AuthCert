// ===============================================
//        CONVERSION PDF -> IMAGE (pour l'OCR)
// Le modèle vision n'accepte que des images. On rend
// la 1re page du PDF en PNG via pdf-to-img (pdfjs-dist
// + @napi-rs/canvas précompilé : aucun binaire système).
// pdf-to-img est ESM-only -> import dynamique.
// ===============================================

/**
 * Convertit la première page d'un PDF (Buffer) en PNG (Buffer).
 * @param {Buffer} buffer  contenu binaire du PDF
 * @param {{ scale?: number }} [options]  échelle de rendu (défaut 2 ≈ ~150-200 DPI)
 * @returns {Promise<Buffer>} le PNG de la première page
 */
async function convertPdfFirstPageToPng(buffer, options = {}) {
  const { scale = 2 } = options;
  const { pdf } = await import('pdf-to-img');

  const document = await pdf(buffer, { scale });
  for await (const page of document) {
    return page; // première page suffisante pour un diplôme
  }
  throw new Error('PDF vide ou illisible');
}

module.exports = { convertPdfFirstPageToPng };
