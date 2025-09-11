-- CreateEnum
CREATE TYPE "public"."StatutCertificat" AS ENUM ('BROUILLON', 'A_EMETTRE', 'EMIS', 'REVOQUE');

-- CreateTable
CREATE TABLE "public"."certificats" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "etablissementId" INTEGER NOT NULL,
    "apprenantId" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "mention" TEXT,
    "dateObtention" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "pdfHash" TEXT,
    "statut" "public"."StatutCertificat" NOT NULL DEFAULT 'BROUILLON',
    "txHash" TEXT,
    "contractAddress" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificats_uuid_key" ON "public"."certificats"("uuid");

-- AddForeignKey
ALTER TABLE "public"."certificats" ADD CONSTRAINT "certificats_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificats" ADD CONSTRAINT "certificats_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE RESTRICT ON UPDATE CASCADE;
