-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL DEFAULT 'Syndic',
    "brandColor" TEXT NOT NULL DEFAULT '#4f46e5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
