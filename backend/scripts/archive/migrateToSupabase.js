const fs = require('fs');
const path = require('path');
const supabaseStorage = require('../../src/services/storageService');

/**
 * Script de migration des fichiers locaux vers Supabase Storage
 */
async function migrateFiles() {
  console.log('🚀 Début de la migration vers Supabase Storage...');

  try {
    // Initialiser Supabase
    const initResult = await supabaseStorage.ensureBucketExists();
    if (!initResult.success) {
      throw new Error(`Erreur initialisation Supabase: ${initResult.error}`);
    }

    // Migrer les certificats
    await migrateCertificates();
    
    // Migrer les documents d'établissements
    await migrateEstablishmentDocuments();

    console.log('✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

async function migrateCertificates() {
  const certificatsDir = path.join(__dirname, '../uploads/certificats');
  
  if (!fs.existsSync(certificatsDir)) {
    console.log('📁 Aucun dossier certificats à migrer');
    return;
  }

  const files = fs.readdirSync(certificatsDir);
  console.log(`📄 Migration de ${files.length} certificats...`);

  for (const file of files) {
    if (path.extname(file) === '.pdf') {
      const localPath = path.join(certificatsDir, file);
      console.log(`📤 Migration: ${file}`);
      
      const result = await supabaseStorage.migrateLocalFile(localPath, file, 'certificats');
      
      if (result.success) {
        console.log(`✅ ${file} → ${result.url}`);
      } else {
        console.error(`❌ Erreur ${file}: ${result.error}`);
      }
    }
  }
}

async function migrateEstablishmentDocuments() {
  const etablissementsDir = path.join(__dirname, '../uploads/etablissements');
  
  if (!fs.existsSync(etablissementsDir)) {
    console.log('📁 Aucun dossier établissements à migrer');
    return;
  }

  const folders = fs.readdirSync(etablissementsDir);
  console.log(`📄 Migration des documents d'établissements...`);

  for (const folder of folders) {
    const folderPath = path.join(etablissementsDir, folder);
    
    if (fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        const localPath = path.join(folderPath, file);
        console.log(`📤 Migration: ${folder}/${file}`);
        
        const result = await supabaseStorage.migrateLocalFile(
          localPath, 
          file, 
          `etablissements/${folder}`
        );
        
        if (result.success) {
          console.log(`✅ ${folder}/${file} → ${result.url}`);
        } else {
          console.error(`❌ Erreur ${folder}/${file}: ${result.error}`);
        }
      }
    }
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  migrateFiles();
}

module.exports = { migrateFiles };


