-- =============================================================================
-- Insertion d'un compte administrateur AuthCert
-- =============================================================================
-- Compatible pgAdmin (PostgreSQL local) ET Supabase (SQL Editor).
--
-- Identifiants par defaut (A CHANGER apres la premiere connexion) :
--   email    : frckdjoko@gmail.com
--   password : Admin@1234
--
-- Le mot de passe ci-dessous est un hash bcrypt (genere avec bcryptjs, cout=10).
-- Pour utiliser un autre mot de passe, regenerez un hash :
--   cd backend
--   node -e "console.log(require('bcryptjs').hashSync('VOTRE_MOT_DE_PASSE', 10))"
-- puis remplacez la valeur de "motDePasse" ci-dessous.
--
-- Remarque : les noms de colonnes en camelCase doivent rester entre guillemets
-- doubles ("motDePasse", "dateModification") car Prisma les cree sensibles a la casse.
-- =============================================================================

INSERT INTO admins (email, "motDePasse", nom, prenom, "dateModification")
VALUES (
  'frckdjoko@gmail.com',
  '$2a$10$1E/.h5Z5r.6O6ZCiw29uf.bDF1j2acszTnCH.7daD.w3Pw0qr0xYK',
  'Administrateur',
  'AuthCert',
  now()
)
ON CONFLICT (email) DO UPDATE
  SET "motDePasse" = EXCLUDED."motDePasse",
      nom = EXCLUDED.nom,
      prenom = EXCLUDED.prenom,
      "dateModification" = now();

-- Verification (optionnel) :
-- SELECT id_admin, email, nom, prenom, statut FROM admins;
