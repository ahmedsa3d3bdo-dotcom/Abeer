DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'serial_number'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "serial_number" varchar(120);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'spec_material'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "spec_material" text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'spec_color'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "spec_color" text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'spec_dimensions'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "spec_dimensions" text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'spec_style'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "spec_style" text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'spec_ideal_for'
    ) THEN
      ALTER TABLE "products" ADD COLUMN "spec_ideal_for" text;
    END IF;
  END IF;
END $$;
