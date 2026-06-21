-- AddForeignKey: RetainerContract.clientId -> Client.id
-- (column already exists; this just enforces the FK constraint)
ALTER TABLE "RetainerContract" ADD CONSTRAINT "RetainerContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
