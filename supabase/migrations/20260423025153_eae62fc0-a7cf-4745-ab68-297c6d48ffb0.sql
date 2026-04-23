
-- 1) Hide email from non-owners on profiles
-- Drop the broad visibility policy that exposes ALL columns (incl. email) to viewers
DROP POLICY IF EXISTS "Profiles: visible profile rows" ON public.profiles;

-- Owner full read remains in place ("Profiles: owner full read")
-- Non-owners should use the public_profiles view (which excludes email).
-- If something queries profiles directly for non-owners it will simply return no rows
-- for those users, which is the secure default.

-- Ensure the public_profiles view is accessible to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2) Lock down messages UPDATE so senders cannot tamper with moderation fields
DROP POLICY IF EXISTS "allow_update" ON public.messages;

-- Senders may only mark their own messages as read or update content,
-- but cannot modify moderation columns (is_flagged, flag_reason)
CREATE POLICY "Senders can update own messages (no moderation tamper)"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (
  auth.uid() = sender_id
  AND is_flagged = (SELECT m.is_flagged FROM public.messages m WHERE m.id = messages.id)
  AND flag_reason IS NOT DISTINCT FROM (SELECT m.flag_reason FROM public.messages m WHERE m.id = messages.id)
);

-- Allow receivers to mark messages as read (and only that)
CREATE POLICY "Receivers can mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (
  auth.uid() = receiver_id
  AND sender_id = (SELECT m.sender_id FROM public.messages m WHERE m.id = messages.id)
  AND receiver_id = (SELECT m.receiver_id FROM public.messages m WHERE m.id = messages.id)
  AND content = (SELECT m.content FROM public.messages m WHERE m.id = messages.id)
  AND is_flagged = (SELECT m.is_flagged FROM public.messages m WHERE m.id = messages.id)
  AND flag_reason IS NOT DISTINCT FROM (SELECT m.flag_reason FROM public.messages m WHERE m.id = messages.id)
);
