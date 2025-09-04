/*
  Warnings:

  - You are about to drop the column `etablissementId` on the `apprenants` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."StatutLiaison" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'SUSPENDU');

-- DropForeignKey
ALTER TABLE "public"."apprenants" DROP CONSTRAINT "apprenants_etablissementId_fkey";

-- AlterTable
ALTER TABLE "public"."apprenants" DROP COLUMN "etablissementId";

-- CreateTable
CREATE TABLE "public"."liaisons_apprenant_etablissement" (
    "id" SERIAL NOT NULL,
    "apprenantId" INTEGER NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "statutLiaison" "public"."StatutLiaison" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApprobation" TIMESTAMP(3),
    "dateRejet" TIMESTAMP(3),
    "messageDemande" TEXT,
    "messageReponse" TEXT,
    "approuvePar" INTEGER,

    CONSTRAINT "liaisons_apprenant_etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liaisons_apprenant_etablissement_apprenantId_etablissementI_key" ON "public"."liaisons_apprenant_etablissement"("apprenantId", "etablissementId");

-- AddForeignKey
ALTER TABLE "public"."liaisons_apprenant_etablissement" ADD CONSTRAINT "liaisons_apprenant_etablissement_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."liaisons_apprenant_etablissement" ADD CONSTRAINT "liaisons_apprenant_etablissement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;
