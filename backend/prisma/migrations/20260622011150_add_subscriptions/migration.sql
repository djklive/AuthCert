-- CreateEnum
CREATE TYPE "public"."StatutAbonnement" AS ENUM ('TRIAL', 'ACTIF', 'PAST_DUE', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "public"."PeriodeAbonnement" AS ENUM ('MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "public"."StatutPaiement" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHOUE', 'ANNULE');

-- CreateTable
CREATE TABLE "public"."password_resets" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" SERIAL NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "statut" "public"."StatutAbonnement" NOT NULL DEFAULT 'TRIAL',
    "periode" "public"."PeriodeAbonnement" NOT NULL DEFAULT 'MENSUEL',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "annulationDemandee" BOOLEAN NOT NULL DEFAULT false,
    "derniereReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "reference" TEXT NOT NULL,
    "notchpayReference" TEXT,
    "montant" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "plan" TEXT NOT NULL,
    "periode" "public"."PeriodeAbonnement" NOT NULL,
    "statut" "public"."StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "public"."password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_email_userType_used_idx" ON "public"."password_resets"("email", "userType", "used");

-- CreateIndex
CREATE INDEX "password_resets_token_expiresAt_idx" ON "public"."password_resets"("token", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_etablissementId_key" ON "public"."subscriptions"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "public"."payments"("reference");

-- CreateIndex
CREATE INDEX "payments_etablissementId_idx" ON "public"."payments"("etablissementId");

-- CreateIndex
CREATE INDEX "payments_statut_idx" ON "public"."payments"("statut");

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
