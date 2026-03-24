CREATE TABLE IF NOT EXISTS "PageVisibilitySetting" (
  "id" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "superAdmin" BOOLEAN NOT NULL DEFAULT true,
  "admin" BOOLEAN NOT NULL DEFAULT true,
  "manager" BOOLEAN NOT NULL DEFAULT true,
  "operator" BOOLEAN NOT NULL DEFAULT true,
  "viewer" BOOLEAN NOT NULL DEFAULT true,
  "owner" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageVisibilitySetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PageVisibilitySetting_href_key"
  ON "PageVisibilitySetting"("href");

CREATE INDEX IF NOT EXISTS "PageVisibilitySetting_section_idx"
  ON "PageVisibilitySetting"("section");

CREATE INDEX IF NOT EXISTS "PageVisibilitySetting_isEnabled_idx"
  ON "PageVisibilitySetting"("isEnabled");
