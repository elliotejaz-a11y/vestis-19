
-- Drop the overly permissive insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- The trigger function runs as SECURITY DEFINER so it bypasses RLS.
-- No INSERT policy needed for regular users.
