DO $$ BEGIN
  ALTER TABLE "DirectIncome" ADD CONSTRAINT "DirectIncome_ventureId_fkey"
    FOREIGN KEY ("ventureId") REFERENCES "Venture"(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
