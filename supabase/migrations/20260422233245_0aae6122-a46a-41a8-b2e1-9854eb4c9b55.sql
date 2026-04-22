DROP POLICY IF EXISTS "Authenticated users insert activity" ON public.activity_log;

CREATE POLICY "CSMs insert activity for their accounts"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = activity_log.account_id
        AND a.assigned_csm_id = auth.uid()
    )
  );
