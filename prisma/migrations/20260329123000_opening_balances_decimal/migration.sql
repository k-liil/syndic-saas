-- Store opening balances with cents precision.
ALTER TABLE "AppSettings"
  ALTER COLUMN "openingCashBalance" TYPE DECIMAL(12,2) USING "openingCashBalance"::DECIMAL(12,2),
  ALTER COLUMN "openingCashBalance" SET DEFAULT 0.00,
  ALTER COLUMN "openingBankBalance" TYPE DECIMAL(12,2) USING "openingBankBalance"::DECIMAL(12,2),
  ALTER COLUMN "openingBankBalance" SET DEFAULT 0.00;

