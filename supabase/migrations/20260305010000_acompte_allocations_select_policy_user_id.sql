-- Ensure authenticated users can read their own acompte allocations directly by user_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'acompte_allocations'
      AND policyname = 'acompte_allocations_select_user_id'
  ) THEN
    CREATE POLICY "acompte_allocations_select_user_id"
      ON public.acompte_allocations
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
