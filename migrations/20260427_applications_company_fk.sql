ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_id UUID NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'applications_company_id_fkey' AND table_name = 'applications'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications (company_id);
