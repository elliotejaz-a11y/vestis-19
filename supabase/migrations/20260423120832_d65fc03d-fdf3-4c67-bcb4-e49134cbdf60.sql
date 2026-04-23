DROP POLICY IF EXISTS "Profiles: visible profile rows" ON public.profiles;
CREATE POLICY "Profiles: visible profile rows" ON public.profiles FOR SELECT TO authenticated USING (true);