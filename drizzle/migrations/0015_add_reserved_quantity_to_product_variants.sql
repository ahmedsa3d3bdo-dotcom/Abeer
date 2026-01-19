DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_variants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_variants'
        AND column_name = 'reserved_quantity'
    ) THEN
      ALTER TABLE "product_variants" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;
    END IF;
  END IF;
END $$;
