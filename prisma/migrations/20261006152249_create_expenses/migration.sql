-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'SUPERMARKET', 'TRANSPORT', 'FUEL', 'OUTINGS', 'EDUCATION', 'HEALTH', 'SERVICES', 'OTHER', 'UNCATEGORIZED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MERCADO_PAGO', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS');

-- CreateEnum
CREATE TYPE "ExpenseSource" AS ENUM ('MANUAL_WEB');

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "occurred_on" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'UNCATEGORIZED',
    "payment_method" "PaymentMethod" NOT NULL,
    "merchant" VARCHAR(120),
    "description" VARCHAR(500),
    "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL_WEB',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_list_order_idx" ON "expenses"("occurred_on" DESC, "created_at" DESC, "id");

-- Keep the money invariant even for writes that bypass the application.
ALTER TABLE "expenses"
ADD CONSTRAINT "expenses_amount_cents_range"
CHECK ("amount_cents" BETWEEN 1 AND 99999999999);
