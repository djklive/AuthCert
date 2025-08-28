/*
  Warnings:

  - You are about to drop the column `statutEtablissement` on the `etablissements` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."etablissements" DROP COLUMN "statutEtablissement",
ADD COLUMN     "statut" "public"."Statut" NOT NULL DEFAULT 'EN_ATTENTE';
