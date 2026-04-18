import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Member {
  id: string;
  room_id: string;
  device_id: string;
  nickname: string;
  color: string;
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  heading: number | null;
  is_driving: boolean;
  last_update: string;
}

export function useRoomMembers(roomId: string | null) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) { setMembers([]); setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("room_id", roomId);
      if (!cancelled && data) setMembers(data as Member[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMembers((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((m) => m.id !== (payload.old as Member).id);
            }
            const row = payload.new as Member;
            const idx = prev.findIndex((m) => m.id === row.id);
            if (idx === -1) return [...prev, row];
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { members, loading };
}
