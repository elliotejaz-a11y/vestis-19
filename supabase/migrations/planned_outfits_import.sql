INSERT INTO public.planned_outfits (id,user_id,outfit_id,planned_date,notes,worn,created_at)
VALUES
('2c82f743-0950-47b1-a63e-24d1b2a69bec','d37b0f1b-85f6-4b70-aebf-1f11f6d9ffad','9663ff0f-bb83-4303-b256-76617bb5cd35','2026-03-29','',true,'2026-03-31T19:24:12.520192+00:00'),
('10d9819f-4fb5-40e2-92f2-80ed79d3edfb','d37b0f1b-85f6-4b70-aebf-1f11f6d9ffad','2cd4759b-9d56-4538-9f72-0a468cdb6859','2026-04-07','',true,'2026-04-08T08:01:52.07616+00:00'),
('a5a59090-85d8-49de-a8bc-965727a3ccb6','d37b0f1b-85f6-4b70-aebf-1f11f6d9ffad','24ce21d8-ceeb-4a19-8332-e2fb7907756e','2026-04-30','',true,'2026-04-30T07:55:18.168535+00:00'),
('3b67c260-626c-4421-9d42-b53b9a16c9b3','0efc7833-4b0b-406a-9bc8-4ce683341c40','8b20497d-d806-43ae-b3b6-c63b09d7b4d6','2026-05-02','',true,'2026-05-02T11:39:23.489889+00:00')
ON CONFLICT (id) DO NOTHING;