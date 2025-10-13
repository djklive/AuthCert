-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."StatutCertificat" ADD VALUE 'EN_COURS_EMISSION';
ALTER TYPE "public"."StatutCertificat" ADD VALUE 'EMISSION_ECHEC';
ALTER TYPE "public"."StatutCertificat" ADD VALUE 'EN_COURS_REVOCATION';
ALTER TYPE "public"."StatutCertificat" ADD VALUE 'REVOQUE_ECHEC';

-- AlterTable
ALTER TABLE "public"."certificats" ADD COLUMN     "emissionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emissionTxHash" TEXT,
ADD COLUMN     "lastEmissionAttempt" TIMESTAMP(3),
ADD COLUMN     "lastRevocationAttempt" TIMESTAMP(3),
ADD COLUMN     "revocationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revocationReason" TEXT,
ADD COLUMN     "revocationTxHash" TEXT;
