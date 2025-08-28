-- CreateEnum
CREATE TYPE "public"."Statut" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'REJETE');

-- CreateEnum
CREATE TYPE "public"."TypeEtablissement" AS ENUM ('UNIVERSITE_PUBLIQUE', 'UNIVERSITE_PRIVEE', 'INSTITUT_SUPERIEUR', 'ECOLE_TECHNIQUE', 'CENTRE_FORMATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "public"."StatutDocument" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REJETE', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."apprenants" (
    "id_apprenant" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "statut" "public"."Statut" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "etablissementId" INTEGER,

    CONSTRAINT "apprenants_pkey" PRIMARY KEY ("id_apprenant")
);

-- CreateTable
CREATE TABLE "public"."etablissements" (
    "id_etablissement" SERIAL NOT NULL,
    "nomEtablissement" TEXT NOT NULL,
    "emailEtablissement" TEXT NOT NULL,
    "motDePasseEtablissement" TEXT NOT NULL,
    "rccmEtablissement" TEXT NOT NULL,
    "typeEtablissement" "public"."TypeEtablissement" NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "adresseEtablissement" TEXT NOT NULL,
    "telephoneEtablissement" TEXT NOT NULL,
    "nomResponsableEtablissement" TEXT NOT NULL,
    "emailResponsableEtablissement" TEXT NOT NULL,
    "telephoneResponsableEtablissement" TEXT NOT NULL,
    "statutEtablissement" "public"."Statut" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "etablissements_pkey" PRIMARY KEY ("id_etablissement")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id_admin" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "statut" "public"."Statut" NOT NULL DEFAULT 'ACTIF',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id_admin")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents_etablissement" (
    "id" SERIAL NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "typeDocument" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "tailleFichier" INTEGER NOT NULL,
    "cheminFichier" TEXT,
    "statut" "public"."StatutDocument" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidation" TIMESTAMP(3),
    "commentaires" TEXT,

    CONSTRAINT "documents_etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apprenants_email_key" ON "public"."apprenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "etablissements_emailEtablissement_key" ON "public"."etablissements"("emailEtablissement");

-- CreateIndex
CREATE UNIQUE INDEX "etablissements_rccmEtablissement_key" ON "public"."etablissements"("rccmEtablissement");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- AddForeignKey
ALTER TABLE "public"."apprenants" ADD CONSTRAINT "apprenants_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents_etablissement" ADD CONSTRAINT "documents_etablissement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE RESTRICT ON UPDATE CASCADE;
