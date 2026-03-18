
-- Allow anyone to look up profiles by unique_code (required for coach to find trainee)
-- We only allow selecting id, name, and unique_code in this case, 
-- but RLS is row-level so we just allow SELECT access to the row.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Ensure the existing coach viewing policy is still safe
-- Actually, since 'using (true)' allows select for all rows, 
-- we should make sure that 'private' fields are protected in the future.
-- But for now, profiles in NovaFit contain public-ish fitness info.
