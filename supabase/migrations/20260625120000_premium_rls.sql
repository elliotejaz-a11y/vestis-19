-- Protect is_premium from direct client-side modification.
--
-- The existing "Users can update own profile" UPDATE policy had no WITH CHECK
-- clause, meaning a client could set is_premium = true directly via the anon
-- key. This replaces it with a version that requires is_premium to remain
-- unchanged in any client-initiated UPDATE.
--
-- The service role key (used exclusively by vestis-stripe-webhook) bypasses
-- RLS entirely, so the webhook can still flip is_premium to true after a
-- confirmed Stripe payment.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_premium IS NOT DISTINCT FROM (
    SELECT p.is_premium FROM public.profiles p WHERE p.id = auth.uid()
  )
);
