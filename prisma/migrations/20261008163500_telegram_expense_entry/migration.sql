ALTER TYPE "ExpenseSource" ADD VALUE 'TELEGRAM';

CREATE TABLE "telegram_processed_updates" (
    "bot_id" BIGINT NOT NULL,
    "update_id" BIGINT NOT NULL,
    "expense_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_processed_updates_pkey" PRIMARY KEY ("bot_id","update_id")
);

ALTER TABLE "telegram_processed_updates" ADD CONSTRAINT "telegram_processed_updates_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
