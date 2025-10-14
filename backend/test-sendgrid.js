require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/emailService');

/**
 * Script de test pour vérifier l'envoi d'emails via Gmail (Nodemailer)
 * 
 * Usage:
 * 1. Configure GMAIL_USER et GMAIL_APP_PASSWORD dans .env
 * 2. Change TEST_EMAIL ci-dessous avec ton email
 * 3. Exécute : node test-sendgrid.js
 */

async function testEmail() {
  console.log('\n🧪 ===== TEST NODEMAILER (GMAIL) =====\n');
  
  // Vérifier la configuration
  console.log('📋 Configuration :');
  console.log('  GMAIL_USER:', process.env.GMAIL_USER || '❌ Manquante');
  console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Configurée (masquée)' : '❌ Manquante');
  console.log('  GMAIL_FROM_NAME:', process.env.GMAIL_FROM_NAME || 'AuthCert (défaut)');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('');
  
  // ⚠️ CHANGE ICI avec ton email personnel pour tester
  const TEST_EMAIL = 'ton-email@example.com'; // ← CHANGE MOI !
  
  if (TEST_EMAIL === 'ton-email@example.com') {
    console.error('❌ ERREUR : Change TEST_EMAIL avec ton vrai email dans test-sendgrid.js (ligne 18)');
    process.exit(1);
  }
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERREUR : SENDGRID_API_KEY non configurée dans .env');
    console.log('\n📝 Pour configurer :');
    console.log('   1. Va sur https://app.sendgrid.com/settings/api_keys');
    console.log('   2. Crée une API Key');
    console.log('   3. Ajoute dans backend/.env :');
    console.log('      SENDGRID_API_KEY=SG.abc123...');
    process.exit(1);
  }
  
  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.error('❌ ERREUR : SENDGRID_FROM_EMAIL non configurée dans .env');
    console.log('\n📝 Pour configurer :');
    console.log('   1. Va sur https://app.sendgrid.com/settings/sender_auth');
    console.log('   2. Vérifie un expéditeur (Single Sender)');
    console.log('   3. Ajoute dans backend/.env :');
    console.log('      SENDGRID_FROM_EMAIL=noreply@ton-email.com');
    process.exit(1);
  }
  
  console.log('🚀 Envoi d\'un email de test...');
  console.log(`📧 Destinataire : ${TEST_EMAIL}\n`);
  
  const testLink = 'http://localhost:5173/reset-password?token=test123456789';
  const testUserName = 'Utilisateur Test';
  
  try {
    const result = await sendPasswordResetEmail(TEST_EMAIL, testLink, testUserName);
    
    if (result.success) {
      console.log('✅ ===== TEST RÉUSSI =====');
      console.log('');
      console.log('📬 Email envoyé avec succès !');
      console.log('');
      console.log('🔍 Prochaines étapes :');
      console.log('   1. Vérifie ta boîte email :', TEST_EMAIL);
      console.log('   2. Vérifie aussi les SPAMS/INDÉSIRABLES');
      console.log('   3. Tu devrais voir un bel email AuthCert');
      console.log('');
      console.log('📊 Pour voir l\'activité :');
      console.log('   → https://app.sendgrid.com/email_activity');
      console.log('');
    } else {
      console.error('❌ ===== TEST ÉCHOUÉ =====');
      console.error('');
      console.error('Erreur:', result.error);
      console.error('');
      console.error('🔍 Vérifie :');
      console.error('   1. Que SENDGRID_API_KEY est correct');
      console.error('   2. Que SENDGRID_FROM_EMAIL est vérifié dans SendGrid');
      console.error('   3. Les logs ci-dessus pour plus de détails');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ ===== EXCEPTION =====');
    console.error('');
    console.error('Exception:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test
testEmail();

