-- Drop the restrictive insert policy that requires friendship
DROP POLICY IF EXISTS "Users can send messages to friends" ON public.messages;

-- Add a simple insert policy: authenticated users can insert where they are the sender
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);