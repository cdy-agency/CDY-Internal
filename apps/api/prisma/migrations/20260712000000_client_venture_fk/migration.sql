-- AddForeignKey Client → Venture
-- Establishes the FK that was deferred in 20260629200000_finance_improvements
-- because the Venture table is only created in 20260711100000_ventures_module.
DO $$ BEGIN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_ventureId_fkey"
        FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
