const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseStorageService {
  constructor() {
    this.bucketName = 'authcert-files';
  }

  /**
   * Upload un fichier vers Supabase Storage
   * @param {Buffer|string} fileData - Données du fichier
   * @param {string} fileName - Nom du fichier
   * @param {string} folder - Dossier de destination (ex: 'certificats', 'etablissements')
   * @param {string} contentType - Type MIME du fichier
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadFile(fileData, fileName, folder = 'uploads', contentType = 'application/octet-stream') {
    try {
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const extension = path.extname(fileName);
      const baseName = path.basename(fileName, extension);
      const uniqueFileName = `${folder}/${timestamp}_${baseName}${extension}`;

      console.log(`📤 Upload vers Supabase: ${uniqueFileName}`);

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, fileData, {
          contentType,
          upsert: false // Ne pas écraser si le fichier existe
        });

      if (error) {
        console.error('❌ Erreur upload Supabase:', error);
        return { success: false, error: error.message };
      }

      // Générer une URL publique
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);

      console.log(`✅ Upload réussi: ${urlData.publicUrl}`);

      return {
        success: true,
        url: urlData.publicUrl,
        path: uniqueFileName,
        fileName: uniqueFileName
      };

    } catch (error) {
      console.error('❌ Erreur service Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Générer une URL signée pour un fichier privé
   * @param {string} filePath - Chemin du fichier dans le bucket
   * @param {number} expiresIn - Durée d'expiration en secondes (défaut: 1 heure)
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Erreur URL signée:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        url: data.signedUrl
      };

    } catch (error) {
      console.error('❌ Erreur génération URL signée:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer un fichier de Supabase Storage
   * @param {string} filePath - Chemin du fichier à supprimer
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erreur suppression:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Fichier supprimé: ${filePath}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Migrer un fichier local vers Supabase
   * @param {string} localPath - Chemin local du fichier
   * @param {string} fileName - Nom du fichier de destination
   * @param {string} folder - Dossier de destination
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async migrateLocalFile(localPath, fileName, folder = 'uploads') {
    try {
      // Vérifier que le fichier local existe
      if (!fs.existsSync(localPath)) {
        return { success: false, error: 'Fichier local introuvable' };
      }

      // Lire le fichier local
      const fileData = fs.readFileSync(localPath);
      const contentType = this.getContentType(fileName);

      // Upload vers Supabase
      const result = await this.uploadFile(fileData, fileName, folder, contentType);

      if (result.success) {
        // Optionnel: supprimer le fichier local après migration
        // fs.unlinkSync(localPath);
        console.log(`✅ Migration réussie: ${localPath} → ${result.url}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Erreur migration fichier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Déterminer le type MIME d'un fichier
   * @param {string} fileName - Nom du fichier
   * @returns {string} Type MIME
   */
  getContentType(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Créer le bucket s'il n'existe pas
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async ensureBucketExists() {
    try {
      // Vérifier si le bucket existe
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Erreur liste buckets:', listError);
        return { success: false, error: listError.message };
      }

      const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // Créer le bucket
        const { data, error } = await supabase.storage.createBucket(this.bucketName, {
          public: false, // Bucket privé pour la sécurité
          fileSizeLimit: 50 * 1024 * 1024, // 50MB max
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/svg+xml',
            'text/plain',
            'application/json'
          ]
        });

        if (error) {
          console.error('❌ Erreur création bucket:', error);
          return { success: false, error: error.message };
        }

        console.log(`✅ Bucket créé: ${this.bucketName}`);
      } else {
        console.log(`✅ Bucket existe déjà: ${this.bucketName}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Erreur vérification bucket:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SupabaseStorageService();
