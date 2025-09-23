-- CreateEnum
CREATE TYPE "public"."TypeFormation" AS ENUM ('DIPLOME', 'CERTIFICAT_FORMATION', 'ATTESTATION_PRESENCE', 'CERTIFICATION_COMPETENCES', 'FORMATION_CONTINUE', 'STAGE', 'SEMINAIRE');

-- CreateEnum
CREATE TYPE "public"."NiveauFormation" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."StatutFormation" AS ENUM ('ACTIF', 'INACTIF', 'ARCHIVE');

-- AlterTable
ALTER TABLE "public"."certificats" ADD COLUMN     "formationId" INTEGER;

-- CreateTable
CREATE TABLE "public"."formations" (
    "id" SERIAL NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "nomFormation" TEXT NOT NULL,
    "description" TEXT,
    "typeFormation" "public"."TypeFormation" NOT NULL,
    "dureeFormation" TEXT,
    "niveauFormation" "public"."NiveauFormation",
    "statut" "public"."StatutFormation" NOT NULL DEFAULT 'ACTIF',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."certificats" ADD CONSTRAINT "certificats_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "public"."formations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."formations" ADD CONSTRAINT "formations_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;
