
-- pg_cron: Cleanup de report_snapshots expirados (a cada 6h)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-report-snapshots');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-report-snapshots',
  '0 */6 * * *',
  $$DELETE FROM report_snapshots WHERE expires_at < now()$$
);
