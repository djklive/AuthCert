-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TypeNotification" ADD VALUE 'ETABLISSEMENT_INSCRIPTION';
ALTER TYPE "public"."TypeNotification" ADD VALUE 'PAIEMENT_ECHOUE';

-- CreateTable
CREATE TABLE "public"."admin_settings" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "autoReports" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_settings_adminId_key" ON "public"."admin_settings"("adminId");

-- AddForeignKey
ALTER TABLE "public"."admin_settings" ADD CONSTRAINT "admin_settings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id_admin") ON DELETE CASCADE ON UPDATE CASCADE;
