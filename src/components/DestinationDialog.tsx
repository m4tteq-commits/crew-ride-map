import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface GeocodeResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  proximity?: { lng: number; lat: number } | null;
  currentLabel?: string | null;
  onPick: (lat: number, lng: number, label: string) => void;
  onClear: () => void;
}

export function DestinationDialog({ open, onOpenChange, token, proximity, currentLabel, onPick, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 3) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          access_token: token,
          autocomplete: "true",
          limit: "6",
        });
        if (proximity) params.set("proximity", `${proximity.lng},${proximity.lat}`);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults((data.features ?? []).map((f: any) => ({
          id: f.id, place_name: f.place_name, center: f.center,
        })));
      } catch {
        toast.error("Eroare la căutare");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, token, proximity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Setează destinația</DialogTitle>
          <DialogDescription>
            Caută o adresă sau apasă lung pe hartă pentru a fixa un punct.
          </DialogDescription>
        </DialogHeader>

        {currentLabel && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{currentLabel}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { onClear(); onOpenChange(false); }}>
              <X className="h-4 w-4" /> Șterge
            </Button>
          </div>
        )}

        <div className="relative">
          <Input
            autoFocus
            placeholder="ex: Aeroport Otopeni, București"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onPick(r.center[1], r.center[0], r.place_name);
                onOpenChange(false);
              }}
              className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-secondary/60"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{r.place_name}</span>
            </button>
          ))}
          {!loading && query.length >= 3 && results.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Niciun rezultat</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
