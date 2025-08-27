/*
  Warnings:

  - Added the required column `prenom` to the `apprenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."apprenants" ADD COLUMN     "prenom" TEXT NOT NULL;
