import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  code: string;
  dest_lat: number | null;
  dest_lng: number | null;
  dest_label: string | null;
  dest_set_by: string | null;
  dest_updated_at: string | null;
}

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!roomId) { setRoom(null); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (!cancelled && data) setRoom(data as Room);
    };
    load();

    const channel = supabase
      .channel(`room-meta-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return room;
}
