import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, getMapboxToken, getProfile } from "@/lib/device";
import { useGeolocation, GeoSample } from "@/hooks/useGeolocation";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { useRoom } from "@/hooks/useRoom";
import { LiveMap } from "@/components/LiveMap";
import { MapboxTokenPrompt } from "@/components/MapboxTokenPrompt";
import { SpeedBadge } from "@/components/SpeedBadge";
import { DestinationDialog } from "@/components/DestinationDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crosshair, Users, Play, Square, Copy, MapPin, Flag } from "lucide-react";
import { toast } from "sonner";
import { haversineMeters, formatDistance, formatEta } from "@/lib/geo";
import type { RouteInfo } from "@/components/LiveMap";
import mapboxgl from "mapbox-gl";

export default function Drive() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const profile = getProfile();
  const deviceId = getDeviceId();

  const [token, setToken] = useState<string | null>(getMapboxToken());
  const [roomId, setRoomId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isDriving, setIsDriving] = useState(false);
  const [followSelf, setFollowSelf] = useState(true);
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const room = useRoom(roomId);
  const destination = room?.dest_lat != null && room?.dest_lng != null
    ? { lat: room.dest_lat, lng: room.dest_lng, label: room.dest_label }
    : null;

  // Trip recording state
  const tripIdRef = useRef<string | null>(null);
  const tripStartRef = useRef<number>(0);
  const tripDistanceRef = useRef<number>(0);
  const tripMaxRef = useRef<number>(0);
  const tripSumRef = useRef<number>(0);
  const tripCountRef = useRef<number>(0);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);

  const { members } = useRoomMembers(roomId);

  // Resolve room + ensure member row exists
  useEffect(() => {
    if (!code || !profile.nickname) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      const { data: room } = await supabase.from("rooms").select("id").eq("code", code).maybeSingle();
      if (!room) {
        toast.error("Camera nu mai există");
        navigate("/rooms", { replace: true });
        return;
      }
      setRoomId(room.id);
      // Upsert member
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("room_id", room.id)
        .eq("device_id", deviceId)
        .maybeSingle();
      if (existing) {
        setMemberId(existing.id);
        await supabase.from("members").update({
          nickname: profile.nickname,
          color: profile.color,
          last_update: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        const { data: created } = await supabase.from("members").insert({
          room_id: room.id,
          device_id: deviceId,
          nickname: profile.nickname,
          color: profile.color,
        }).select("id").single();
        if (created) setMemberId(created.id);
      }
    })();
  }, [code, deviceId, navigate, profile.nickname, profile.color]);

  // Receive geolocation samples; throttle DB writes
  const lastWriteRef = useRef<number>(0);
  const onSample = useCallback(async (s: GeoSample) => {
    if (!memberId) return;

    // Trip tracking
    if (tripIdRef.current) {
      if (lastPointRef.current) {
        tripDistanceRef.current += haversineMeters(
          lastPointRef.current.lat, lastPointRef.current.lng, s.lat, s.lng
        );
      }
      lastPointRef.current = { lat: s.lat, lng: s.lng };
      if (s.speedKmh > tripMaxRef.current) tripMaxRef.current = s.speedKmh;
      tripSumRef.current += s.speedKmh;
      tripCountRef.current += 1;
      // Persist trip point (best-effort, no await needed for UI)
      supabase.from("trip_points").insert({
        trip_id: tripIdRef.current,
        lat: s.lat,
        lng: s.lng,
        speed_kmh: s.speedKmh,
      });
    }

    // Throttle realtime write to ~1 every 1.5s
    const now = Date.now();
    if (now - lastWriteRef.current < 1500) return;
    lastWriteRef.current = now;

    await supabase.from("members").update({
      lat: s.lat,
      lng: s.lng,
      speed_kmh: s.speedKmh,
      heading: s.heading,
      is_driving: true,
      last_update: new Date().toISOString(),
    }).eq("id", memberId);
  }, [memberId]);

  useGeolocation({ enabled: isDriving && !!memberId, onSample });

  // Mark inactive on stop / unmount
  useEffect(() => {
    return () => {
      if (memberId) {
        supabase.from("members").update({ is_driving: false }).eq("id", memberId);
      }
    };
  }, [memberId]);

  const me = useMemo(() => members.find((m) => m.device_id === deviceId), [members, deviceId]);
  const others = useMemo(() => members.filter((m) => m.device_id !== deviceId), [members, deviceId]);
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (b.speed_kmh ?? 0) - (a.speed_kmh ?? 0));
  }, [members]);

  const startDrive = async () => {
    setIsDriving(true);
    tripStartRef.current = Date.now();
    tripDistanceRef.current = 0;
    tripMaxRef.current = 0;
    tripSumRef.current = 0;
    tripCountRef.current = 0;
    lastPointRef.current = null;
    const { data } = await supabase.from("trips").insert({
      device_id: deviceId,
      nickname: profile.nickname,
    }).select("id").single();
    if (data) tripIdRef.current = data.id;
    toast.success("Cursă pornită");
  };

  const stopDrive = async () => {
    setIsDriving(false);
    if (memberId) {
      await supabase.from("members").update({ is_driving: false }).eq("id", memberId);
    }
    if (tripIdRef.current) {
      const duration = Math.round((Date.now() - tripStartRef.current) / 1000);
      const avg = tripCountRef.current > 0 ? tripSumRef.current / tripCountRef.current : 0;
      await supabase.from("trips").update({
        ended_at: new Date().toISOString(),
        distance_m: Math.round(tripDistanceRef.current),
        max_speed_kmh: tripMaxRef.current,
        avg_speed_kmh: avg,
        duration_s: duration,
      }).eq("id", tripIdRef.current);
      tripIdRef.current = null;
    }
    toast.success("Cursă oprită și salvată");
  };

  const fitAll = () => {
    const map = mapRef.current;
    if (!map) return;
    const valid = members.filter((m) => m.lat != null && m.lng != null);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.easeTo({ center: [valid[0].lng!, valid[0].lat!], zoom: 14 });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    valid.forEach((m) => bounds.extend([m.lng!, m.lat!]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
    setFollowSelf(false);
  };

  const centerSelf = () => {
    setFollowSelf(true);
    const map = mapRef.current;
    if (!map || !me?.lat || !me?.lng) return;
    map.easeTo({ center: [me.lng, me.lat], zoom: 15 });
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Cod copiat");
  };

  const setDestination = async (lat: number, lng: number, label: string) => {
    if (!roomId) return;
    const { error } = await supabase.from("rooms").update({
      dest_lat: lat,
      dest_lng: lng,
      dest_label: label,
      dest_set_by: profile.nickname,
      dest_updated_at: new Date().toISOString(),
    }).eq("id", roomId);
    if (error) toast.error("Nu s-a putut salva destinația");
    else toast.success("Destinație setată");
  };

  const clearDestination = async () => {
    if (!roomId) return;
    await supabase.from("rooms").update({
      dest_lat: null, dest_lng: null, dest_label: null,
      dest_set_by: null, dest_updated_at: new Date().toISOString(),
    }).eq("id", roomId);
    toast.success("Destinație ștearsă");
  };

  const handleLongPress = useCallback((lat: number, lng: number) => {
    setDestination(lat, lng, `Punct (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, profile.nickname]);

  const distanceToDest = (m: typeof members[number]) => {
    if (!destination || m.lat == null || m.lng == null) return null;
    return haversineMeters(m.lat, m.lng, destination.lat, destination.lng);
  };

  if (!token) return <MapboxTokenPrompt onSaved={() => setToken(getMapboxToken())} />;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <LiveMap
        token={token}
        members={members}
        selfDeviceId={deviceId}
        followSelf={followSelf}
        destination={destination}
        onMapReady={(m) => { mapRef.current = m; }}
        onLongPress={handleLongPress}
        onRoutesUpdate={setRoutes}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 safe-top">
        <div className="pointer-events-auto flex items-start justify-between gap-2 p-3">
          <Button size="icon" variant="secondary" onClick={() => navigate("/rooms")} className="rounded-full shadow-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col gap-2">
            <Button size="icon" variant="secondary" onClick={centerSelf} className="rounded-full shadow-card">
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={fitAll} className="rounded-full shadow-card">
              <Users className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={destination ? "default" : "secondary"}
              onClick={() => setDestDialogOpen(true)}
              className="rounded-full shadow-card"
              aria-label="Setează destinația"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div className="absolute inset-x-0 bottom-0 safe-bottom">
        <Card className="mx-3 mb-3 bg-card/95 p-4 shadow-card backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <button
                onClick={copyCode}
                className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-mono font-semibold hover:bg-secondary"
                aria-label="Copiază codul camerei"
              >
                {code}
                <Copy className="h-3 w-3 opacity-60" />
              </button>
              <p className="truncate text-sm font-semibold">
                {members.length} în cameră · {others.filter(o => o.is_driving).length + (isDriving ? 1 : 0)} conduc
              </p>
            </div>
            {isDriving ? (
              <Button onClick={stopDrive} variant="destructive" size="lg" className="shrink-0 rounded-full">
                <Square className="h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button onClick={startDrive} size="lg" className="shrink-0 rounded-full bg-gradient-primary shadow-glow">
                <Play className="h-4 w-4" /> Start drive
              </Button>
            )}
          </div>

          {destination && (
            <button
              onClick={() => setDestDialogOpen(true)}
              className="mb-3 flex w-full items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-left text-sm"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                <span className="font-semibold">Destinație:</span>{" "}
                <span className="text-muted-foreground">{destination.label ?? "Punct ales"}</span>
              </span>
            </button>
          )}

          <div className="max-h-32 space-y-2 overflow-y-auto">
            {sortedMembers.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Niciun membru încă</p>
            )}
            {sortedMembers.map((m) => {
              const dist = distanceToDest(m);
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: m.color, opacity: m.is_driving ? 1 : 0.4 }}
                    />
                    <span className="truncate text-sm font-medium">
                      {m.nickname}{m.device_id === deviceId ? " (tu)" : ""}
                    </span>
                    {dist != null && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {formatDistance(dist)}
                      </span>
                    )}
                  </div>
                  <SpeedBadge kmh={m.speed_kmh ?? 0} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <DestinationDialog
        open={destDialogOpen}
        onOpenChange={setDestDialogOpen}
        token={token}
        proximity={me?.lat != null && me?.lng != null ? { lat: me.lat, lng: me.lng } : null}
        currentLabel={destination?.label}
        onPick={(lat, lng, label) => setDestination(lat, lng, label)}
        onClear={clearDestination}
      />
    </div>
  );
}
