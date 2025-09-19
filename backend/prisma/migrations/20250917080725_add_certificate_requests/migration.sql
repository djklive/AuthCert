/*
  Warnings:

  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[apprenantId]` on the table `wallet_vault` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[etablissementId]` on the table `wallet_vault` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."StatutDemandeCertificat" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'EN_COURS_TRAITEMENT');

-- AlterTable
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_pkey",
ADD COLUMN     "adminId" INTEGER,
ADD COLUMN     "apprenantId" INTEGER,
ADD COLUMN     "etablissementId" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."wallet_vault" ADD COLUMN     "apprenantId" INTEGER,
ADD COLUMN     "etablissementId" INTEGER;

-- CreateTable
CREATE TABLE "public"."demandes_certificat" (
    "id" SERIAL NOT NULL,
    "apprenantId" INTEGER NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "messageDemande" TEXT,
    "statutDemande" "public"."StatutDemandeCertificat" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateTraitement" TIMESTAMP(3),
    "messageReponse" TEXT,
    "traitePar" INTEGER,

    CONSTRAINT "demandes_certificat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_demande_certificat" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "tailleFichier" INTEGER NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "dateUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_demande_certificat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_vault_apprenantId_key" ON "public"."wallet_vault"("apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_vault_etablissementId_key" ON "public"."wallet_vault"("etablissementId");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id_admin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_vault" ADD CONSTRAINT "wallet_vault_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_vault" ADD CONSTRAINT "wallet_vault_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."demandes_certificat" ADD CONSTRAINT "demandes_certificat_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."demandes_certificat" ADD CONSTRAINT "demandes_certificat_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_demande_certificat" ADD CONSTRAINT "documents_demande_certificat_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "public"."demandes_certificat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
