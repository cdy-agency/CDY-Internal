-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('PIPELINE', 'DIRECT', 'REFERRAL', 'RETURNING');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "source" "ClientSource" NOT NULL DEFAULT 'DIRECT';

-- CreateIndex
CREATE INDEX "Client_source_idx" ON "Client"("source");
