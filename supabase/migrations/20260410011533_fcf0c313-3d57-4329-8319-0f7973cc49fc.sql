
DROP POLICY IF EXISTS "Users can delete own sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "allow_select" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "allow_update" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
