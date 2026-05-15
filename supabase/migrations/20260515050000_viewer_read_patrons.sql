CREATE POLICY "patrons_select_viewer"
ON patrons
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT patron_id
    FROM profiles
    WHERE id = auth.uid()
      AND patron_id IS NOT NULL
  )
);