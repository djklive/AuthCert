/*
  Warnings:

  - A unique constraint covering the columns `[walletAddress]` on the table `apprenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[smartContractAddress]` on the table `etablissements` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."apprenants" ADD COLUMN     "walletAddress" TEXT;

-- AlterTable
ALTER TABLE "public"."etablissements" ADD COLUMN     "smartContractAddress" TEXT;

-- CreateTable
CREATE TABLE "public"."wallet_vault" (
    "id" SERIAL NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "cipherText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_vault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_vault_ownerType_ownerId_idx" ON "public"."wallet_vault"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "apprenants_walletAddress_key" ON "public"."apprenants"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "etablissements_smartContractAddress_key" ON "public"."etablissements"("smartContractAddress");
