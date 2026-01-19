DO $$
DECLARE
  tz text;
BEGIN
  SELECT value INTO tz FROM system_settings WHERE key = 'app.time_zone' LIMIT 1;
  IF tz IS NULL OR tz = '' THEN
    tz := 'Africa/Cairo';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "audit_logs" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE %L;', tz);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backups' AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "backups" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE %L;', tz);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backups' AND column_name = 'completed_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format(
      'ALTER TABLE "backups" ALTER COLUMN "completed_at" TYPE timestamptz USING CASE WHEN "completed_at" IS NULL THEN NULL ELSE "completed_at" AT TIME ZONE %L END;',
      tz
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'health_checks' AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "health_checks" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE %L;', tz);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'health_checks' AND column_name = 'checked_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "health_checks" ALTER COLUMN "checked_at" TYPE timestamptz USING "checked_at" AT TIME ZONE %L;', tz);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "system_settings" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE %L;', tz);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'updated_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    EXECUTE format('ALTER TABLE "system_settings" ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE %L;', tz);
  END IF;
END $$;
