
ALTER TABLE public.follow_requests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

CREATE POLICY "Target can update request status"
ON public.follow_requests
FOR UPDATE
TO public
USING (auth.uid() = target_id)
WITH CHECK (auth.uid() = target_id);
