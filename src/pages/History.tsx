import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gauge, MapPin, Timer } from "lucide-react";
import { formatDistance, formatDuration } from "@/lib/geo";
import { TripDetail } from "@/components/TripDetail";

interface Trip {
  id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  duration_s: number;
}

export default function History() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("device_id", getDeviceId())
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });
      setTrips((data ?? []) as Trip[]);
    })();
  }, []);

  if (selected) return <TripDetail tripId={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="min-h-screen p-6 safe-top safe-bottom">
      <div className="mx-auto max-w-md">
        <Button variant="ghost" onClick={() => navigate("/rooms")} className="mb-4 -ml-3">
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </Button>
        <h1 className="mb-6 text-2xl font-bold">Istoric trasee</h1>

        {trips.length === 0 && (
          <Card className="bg-gradient-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">Nu ai nicio cursă încă. Pornește un drive pentru a începe.</p>
          </Card>
        )}

        <div className="space-y-3">
          {trips.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className="block w-full text-left">
              <Card className="bg-gradient-card p-4 shadow-card transition hover:scale-[1.01]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {new Date(t.started_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat icon={<MapPin className="h-3.5 w-3.5" />} label="Distanță" value={formatDistance(t.distance_m)} />
                  <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Durată" value={formatDuration(t.duration_s)} />
                  <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Max" value={`${Math.round(t.max_speed_kmh)} km/h`} />
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>
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
