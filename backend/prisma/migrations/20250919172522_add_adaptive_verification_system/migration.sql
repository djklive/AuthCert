/*
  Warnings:

  - Changed the type of `typeDocument` on the `documents_etablissement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."TypeOrganisation" AS ENUM ('ETABLISSEMENT_ENSEIGNEMENT', 'CENTRE_FORMATION_PROFESSIONNELLE', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "public"."TypeDocumentEtablissement" AS ENUM ('CNI_REPRESENTANT', 'LOGO_ETABLISSEMENT', 'PLAQUETTE', 'ARRETE_CREATION', 'AUTORISATION_EXERCER', 'LETTRE_NOMINATION', 'RCCM', 'NIU', 'AGREMENT_MINEFOP', 'POUVOIR_REPRESENTANT', 'CARTE_CONTRIBUABLE', 'POUVOIR_DG');

-- AlterTable
ALTER TABLE "public"."documents_etablissement" DROP COLUMN "typeDocument",
ADD COLUMN     "typeDocument" "public"."TypeDocumentEtablissement" NOT NULL;

-- AlterTable
ALTER TABLE "public"."etablissements" ADD COLUMN     "arreteCreation" TEXT,
ADD COLUMN     "ministereTutelle" TEXT,
ADD COLUMN     "niu" TEXT,
ADD COLUMN     "numeroAgrement" TEXT,
ADD COLUMN     "typeOrganisation" "public"."TypeOrganisation" NOT NULL DEFAULT 'ETABLISSEMENT_ENSEIGNEMENT',
ALTER COLUMN "rccmEtablissement" DROP NOT NULL;
