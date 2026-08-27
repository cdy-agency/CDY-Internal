-- MarketingClient.retainerId had a hard unique constraint, so a retainer
-- could never be relinked to a new MarketingClient after the old one was
-- deleted — soft-delete only stamps deletedAt, so the old row (still
-- carrying that retainerId) kept the DB-level constraint permanently
-- occupied. Replace it with a partial unique index that only enforces
-- uniqueness among ACTIVE rows, so a soft-deleted MarketingClient no longer
-- blocks its retainer from being reused, while still preventing two
-- simultaneously-active MarketingClients from sharing one retainer.

ALTER TABLE "MarketingClient" DROP CONSTRAINT "MarketingClient_retainerId_key";

CREATE UNIQUE INDEX "MarketingClient_retainerId_active_key" ON "MarketingClient"("retainerId") WHERE "deletedAt" IS NULL;

CREATE INDEX "MarketingClient_retainerId_idx" ON "MarketingClient"("retainerId");
