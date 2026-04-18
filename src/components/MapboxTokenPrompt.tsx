import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { setMapboxToken } from "@/lib/device";
import { MapPin } from "lucide-react";

interface Props {
  onSaved: () => void;
}

export function MapboxTokenPrompt({ onSaved }: Props) {
  const [token, setToken] = useState("");

  const save = () => {
    if (!token.trim().startsWith("pk.")) return;
    setMapboxToken(token.trim());
    onSaved();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 safe-top safe-bottom">
      <Card className="w-full max-w-md bg-gradient-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-primary p-3 shadow-glow">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Token Mapbox</h2>
            <p className="text-xs text-muted-foreground">Necesar pentru afișarea hărții</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Creează un cont gratuit pe{" "}
          <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer" className="text-primary underline">
            mapbox.com
          </a>{" "}
          și copiază tokenul public (începe cu <code className="rounded bg-muted px-1">pk.</code>).
        </p>
        <Input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="pk.eyJ1Ijoi..."
          className="mb-3"
        />
        <Button onClick={save} className="w-full" size="lg" disabled={!token.startsWith("pk.")}>
          Salvează token
        </Button>
      </Card>
    </div>
  );
}
