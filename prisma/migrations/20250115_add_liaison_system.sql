-- Migration pour ajouter le système de liaison many-to-many entre apprenants et établissements

-- Supprimer la contrainte de clé étrangère existante
ALTER TABLE "apprenants" DROP CONSTRAINT IF EXISTS "apprenants_etablissementId_fkey";

-- Supprimer la colonne etablissementId de la table apprenants
ALTER TABLE "apprenants" DROP COLUMN IF EXISTS "etablissementId";

-- Créer l'enum pour les statuts de liaison
CREATE TYPE "StatutLiaison" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'SUSPENDU');

-- Créer la table de liaison
CREATE TABLE "liaisons_apprenant_etablissement" (
    "id" SERIAL PRIMARY KEY,
    "apprenantId" INTEGER NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "statutLiaison" "StatutLiaison" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApprobation" TIMESTAMP(3),
    "dateRejet" TIMESTAMP(3),
    "messageDemande" TEXT,
    "messageReponse" TEXT,
    "approuvePar" INTEGER,
    
    -- Contraintes de clés étrangères
    CONSTRAINT "liaisons_apprenant_etablissement_apprenantId_fkey" 
        FOREIGN KEY ("apprenantId") REFERENCES "apprenants"("id_apprenant") ON DELETE CASCADE,
    CONSTRAINT "liaisons_apprenant_etablissement_etablissementId_fkey" 
        FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("id_etablissement") ON DELETE CASCADE,
    
    -- Contrainte d'unicité pour éviter les doublons
    CONSTRAINT "liaisons_apprenant_etablissement_apprenantId_etablissementId_key" 
        UNIQUE ("apprenantId", "etablissementId")
);

-- Créer des index pour améliorer les performances
CREATE INDEX "idx_liaisons_apprenant" ON "liaisons_apprenant_etablissement"("apprenantId");
CREATE INDEX "idx_liaisons_etablissement" ON "liaisons_apprenant_etablissement"("etablissementId");
CREATE INDEX "idx_liaisons_statut" ON "liaisons_apprenant_etablissement"("statutLiaison");
CREATE INDEX "idx_liaisons_date_demande" ON "liaisons_apprenant_etablissement"("dateDemande");

-- Commentaires pour la documentation
COMMENT ON TABLE "liaisons_apprenant_etablissement" IS 'Table de liaison many-to-many entre apprenants et établissements avec gestion des statuts';
COMMENT ON COLUMN "liaisons_apprenant_etablissement"."statutLiaison" IS 'Statut de la liaison: EN_ATTENTE, APPROUVE, REJETE, SUSPENDU';
COMMENT ON COLUMN "liaisons_apprenant_etablissement"."messageDemande" IS 'Message optionnel de l\'apprenant lors de la demande';
COMMENT ON COLUMN "liaisons_apprenant_etablissement"."messageReponse" IS 'Message optionnel de l\'établissement lors de la réponse';
COMMENT ON COLUMN "liaisons_apprenant_etablissement"."approuvePar" IS 'ID de l\'admin qui a approuvé la demande (optionnel)';
