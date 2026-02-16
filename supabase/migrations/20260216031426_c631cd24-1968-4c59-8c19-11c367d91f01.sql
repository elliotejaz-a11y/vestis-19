
CREATE TABLE public.wardrobe_service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wardrobe_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
ON public.wardrobe_service_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests"
ON public.wardrobe_service_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests"
ON public.wardrobe_service_requests FOR DELETE
USING (auth.uid() = user_id);
