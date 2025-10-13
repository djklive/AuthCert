-- CreateEnum
CREATE TYPE "public"."TypeNotification" AS ENUM ('NOUVEAU_CERTIFICAT', 'VERIFICATION_CERTIFICAT', 'DEMANDE_LIAISON_APPRENANT', 'DEMANDE_LIAISON_APPROUVEE', 'DEMANDE_LIAISON_REJETEE', 'DEMANDE_CERTIFICAT_NOUVELLE', 'DEMANDE_CERTIFICAT_APPROUVEE', 'DEMANDE_CERTIFICAT_REJETEE', 'CERTIFICAT_REVOQUE', 'NOUVELLE_SESSION', 'SECURITE_ALERTE', 'SYSTEME_MISE_A_JOUR', 'ABONNEMENT_EXPIRE', 'ABONNEMENT_RENOUVELE');

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userType" TEXT NOT NULL,
    "type" "public"."TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "lienAction" TEXT,
    "metadonnees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "apprenantId" INTEGER,
    "etablissementId" INTEGER,
    "adminId" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_userType_lu_idx" ON "public"."notifications"("userId", "userType", "lu");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "public"."apprenants"("id_apprenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "public"."etablissements"("id_etablissement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id_admin") ON DELETE CASCADE ON UPDATE CASCADE;
