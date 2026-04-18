import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { getMapboxToken } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gauge, MapPin, Timer } from "lucide-react";
import { formatDistance, formatDuration } from "@/lib/geo";
import { MapboxTokenPrompt } from "./MapboxTokenPrompt";

interface Props {
  tripId: string;
  onBack: () => void;
}

export function TripDetail({ tripId, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(getMapboxToken());
  const [trip, setTrip] = useState<any>(null);
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
        supabase.from("trip_points").select("lat,lng").eq("trip_id", tripId).order("recorded_at"),
      ]);
      setTrip(t);
      setPoints((p ?? []) as any);
    })();
  }, [tripId]);

  useEffect(() => {
    if (!token || !containerRef.current || points.length === 0) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      attributionControl: false,
    });
    map.on("load", () => {
      const coords = points.map((p) => [p.lng, p.lat] as [number, number]);
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": "#22d3ee", "line-width": 5, "line-opacity": 0.9 },
      });
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60, duration: 0 });

      new mapboxgl.Marker({ color: "#22d3ee" }).setLngLat(coords[0]).addTo(map);
      new mapboxgl.Marker({ color: "#f87171" }).setLngLat(coords[coords.length - 1]).addTo(map);
    });
    return () => map.remove();
  }, [token, points]);

  if (!token) return <MapboxTokenPrompt onSaved={() => setToken(getMapboxToken())} />;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute inset-x-0 top-0 safe-top">
        <div className="p-3">
          <Button size="icon" variant="secondary" onClick={onBack} className="rounded-full shadow-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {trip && (
        <div className="absolute inset-x-0 bottom-0 safe-bottom">
          <Card className="mx-3 mb-3 bg-card/95 p-4 shadow-card backdrop-blur">
            <p className="mb-3 text-sm font-semibold">
              {new Date(trip.started_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat icon={<MapPin className="h-3.5 w-3.5" />} label="Distanță" value={formatDistance(trip.distance_m)} />
              <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Durată" value={formatDuration(trip.duration_s)} />
              <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Max" value={`${Math.round(trip.max_speed_kmh)}`} />
              <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Medie" value={`${Math.round(trip.avg_speed_kmh)}`} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
