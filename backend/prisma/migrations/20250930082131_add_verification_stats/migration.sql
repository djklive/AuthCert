-- CreateTable
CREATE TABLE "public"."verification_stats" (
    "id" SERIAL NOT NULL,
    "certificatId" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "verificationType" TEXT NOT NULL DEFAULT 'public',

    CONSTRAINT "verification_stats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."verification_stats" ADD CONSTRAINT "verification_stats_certificatId_fkey" FOREIGN KEY ("certificatId") REFERENCES "public"."certificats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
