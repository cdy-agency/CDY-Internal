-- CreateEnum
CREATE TYPE "ReserveType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "ReserveAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'CDY Company Reserve',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReserveAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveTransaction" (
    "id" TEXT NOT NULL,
    "reserveAccountId" TEXT NOT NULL,
    "type" "ReserveType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReserveTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReserveTransaction_reserveAccountId_idx" ON "ReserveTransaction"("reserveAccountId");

-- CreateIndex
CREATE INDEX "ReserveTransaction_createdAt_idx" ON "ReserveTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "ReserveTransaction_type_idx" ON "ReserveTransaction"("type");

-- AddForeignKey
ALTER TABLE "ReserveTransaction" ADD CONSTRAINT "ReserveTransaction_reserveAccountId_fkey" FOREIGN KEY ("reserveAccountId") REFERENCES "ReserveAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
