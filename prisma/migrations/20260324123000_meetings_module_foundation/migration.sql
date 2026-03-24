DO $$ BEGIN
  CREATE TYPE "MeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'CONVOCATIONS_SENT', 'MINUTES_READY', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingVoteRule" AS ENUM ('SIMPLE', 'ABSOLUTE', 'DOUBLE', 'UNANIMOUS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingResolutionStatus" AS ENUM ('PENDING', 'ADOPTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingDocumentType" AS ENUM ('ATTENDANCE_SHEET', 'MINUTES', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingDocumentSourceType" AS ENUM ('UPLOAD', 'VAULT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Meeting"
  ADD COLUMN IF NOT EXISTS "type" "MeetingType" NOT NULL DEFAULT 'ORDINARY',
  ADD COLUMN IF NOT EXISTS "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS "convocationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "minutesGeneratedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MeetingResolution" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "voteRule" "MeetingVoteRule" NOT NULL,
  "status" "MeetingResolutionStatus" NOT NULL DEFAULT 'PENDING',
  "votesFor" INTEGER NOT NULL DEFAULT 0,
  "votesAgainst" INTEGER NOT NULL DEFAULT 0,
  "abstentions" INTEGER NOT NULL DEFAULT 0,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingResolution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeetingDocument" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "type" "MeetingDocumentType" NOT NULL,
  "sourceType" "MeetingDocumentSourceType" NOT NULL DEFAULT 'UPLOAD',
  "title" TEXT NOT NULL,
  "fileName" TEXT,
  "fileUrl" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "vaultDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingDocument_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "MeetingResolution"
    ADD CONSTRAINT "MeetingResolution_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MeetingDocument"
    ADD CONSTRAINT "MeetingDocument_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "MeetingResolution_meetingId_orderIndex_idx" ON "MeetingResolution"("meetingId", "orderIndex");
CREATE INDEX IF NOT EXISTS "MeetingDocument_meetingId_type_idx" ON "MeetingDocument"("meetingId", "type");
CREATE INDEX IF NOT EXISTS "MeetingDocument_vaultDocumentId_idx" ON "MeetingDocument"("vaultDocumentId");
