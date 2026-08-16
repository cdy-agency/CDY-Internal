-- Company-owned receiving accounts (bank / mobile money) that an invoice
-- payment can optionally be attributed to.

-- CreateEnum
CREATE TYPE "CompanyAccountType" AS ENUM ('BANK', 'MOBILE_MONEY', 'OTHER');

-- CreateTable
CREATE TABLE "CompanyAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompanyAccountType" NOT NULL,
    "provider" TEXT,
    "accountNumber" TEXT,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyAccount_type_idx" ON "CompanyAccount"("type");

-- CreateIndex
CREATE INDEX "CompanyAccount_isActive_idx" ON "CompanyAccount"("isActive");

-- CreateIndex
CREATE INDEX "CompanyAccount_deletedAt_idx" ON "CompanyAccount"("deletedAt");

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "accountId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CompanyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
