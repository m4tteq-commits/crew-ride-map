
-- Rooms
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  color TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  is_driving BOOLEAN NOT NULL DEFAULT false,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, device_id)
);

CREATE INDEX idx_members_room ON public.members(room_id);
CREATE INDEX idx_members_last_update ON public.members(last_update);

-- Trips (istoric)
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  distance_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_trips_device ON public.trips(device_id, started_at DESC);

-- Trip points
CREATE TABLE public.trip_points (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_points_trip ON public.trip_points(trip_id, recorded_at);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_points ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth — identification by device_id)
CREATE POLICY "rooms_read_all" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_all" ON public.rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "members_read_all" ON public.members FOR SELECT USING (true);
CREATE POLICY "members_insert_all" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "members_update_all" ON public.members FOR UPDATE USING (true);
CREATE POLICY "members_delete_all" ON public.members FOR DELETE USING (true);

CREATE POLICY "trips_read_all" ON public.trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_all" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "trips_update_all" ON public.trips FOR UPDATE USING (true);
CREATE POLICY "trips_delete_all" ON public.trips FOR DELETE USING (true);

CREATE POLICY "trip_points_read_all" ON public.trip_points FOR SELECT USING (true);
CREATE POLICY "trip_points_insert_all" ON public.trip_points FOR INSERT WITH CHECK (true);

-- Realtime
ALTER TABLE public.members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
