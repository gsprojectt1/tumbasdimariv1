-- FIX: profiles RLS - allow public read so chat can join buyer/seller profiles
-- Without this, the chat query `select('*, store:stores(*), buyer:profiles(*)')` fails
-- because buyer can't read seller's profile and vice versa.

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Keep insert/update own only
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);
