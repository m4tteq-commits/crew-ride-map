ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS dest_lat double precision,
  ADD COLUMN IF NOT EXISTS dest_lng double precision,
  ADD COLUMN IF NOT EXISTS dest_label text,
  ADD COLUMN IF NOT EXISTS dest_set_by text,
  ADD COLUMN IF NOT EXISTS dest_updated_at timestamp with time zone;

DROP POLICY IF EXISTS rooms_update_all ON public.rooms;
CREATE POLICY rooms_update_all ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;