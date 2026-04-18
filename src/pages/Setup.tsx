import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { COLORS, getProfile, saveProfile } from "@/lib/device";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Setup() {
  const navigate = useNavigate();
  const existing = getProfile();
  const [nickname, setNickname] = useState(existing.nickname);
  const [color, setColor] = useState(existing.color || COLORS[0]);

  const submit = () => {
    if (!nickname.trim()) return;
    saveProfile(nickname.trim(), color);
    navigate("/rooms");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 rounded-2xl bg-gradient-primary p-4 shadow-glow">
          <Gauge className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Drive Together</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vezi-ți prietenii live pe hartă</p>
      </div>

      <Card className="w-full max-w-md bg-gradient-card p-6 shadow-card">
        <label className="mb-2 block text-sm font-medium">Numele tău</label>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ex. Andrei"
          maxLength={20}
          autoFocus
        />

        <label className="mb-2 mt-5 block text-sm font-medium">Alege culoarea ta</label>
        <div className="grid grid-cols-8 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Culoare ${c}`}
              className={cn(
                "aspect-square rounded-full border-2 transition-transform",
                color === c ? "scale-110 border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <Button onClick={submit} disabled={!nickname.trim()} size="lg" className="mt-6 w-full">
          Continuă
        </Button>
      </Card>
    </div>
  );
}
