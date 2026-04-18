import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { generateRoomCode, getProfile, setRoomCode } from "@/lib/device";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, LogIn, History, ArrowLeft } from "lucide-react";

export default function Rooms() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const profile = getProfile();

  if (!profile.nickname) {
    navigate("/", { replace: true });
    return null;
  }

  const create = async () => {
    setLoading(true);
    try {
      const newCode = generateRoomCode();
      const { error } = await supabase.from("rooms").insert({ code: newCode });
      if (error) throw error;
      setRoomCode(newCode);
      toast.success(`Cameră creată: ${newCode}`);
      navigate(`/drive/${newCode}`);
    } catch (e) {
      toast.error("Nu s-a putut crea camera");
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    try {
      const { data } = await supabase.from("rooms").select("code").eq("code", c).maybeSingle();
      if (!data) {
        toast.error("Cameră inexistentă");
        return;
      }
      setRoomCode(c);
      navigate(`/drive/${c}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 safe-top safe-bottom">
      <div className="mx-auto max-w-md">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </button>

        <h1 className="mb-1 text-2xl font-bold">Salut, {profile.nickname} 👋</h1>
        <p className="mb-6 text-sm text-muted-foreground">Creează sau intră într-o cameră de grup</p>

        <Card className="mb-4 bg-gradient-card p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold">Creează cameră nouă</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Vei primi un cod scurt pe care îl trimiți prietenilor.
          </p>
          <Button onClick={create} disabled={loading} size="lg" className="w-full">
            <Plus className="h-4 w-4" /> Creează cameră
          </Button>
        </Card>

        <Card className="mb-4 bg-gradient-card p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold">Intră într-o cameră</h2>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BLUE-FOX-42"
            className="mb-3 uppercase"
          />
          <Button onClick={join} disabled={loading || !code.trim()} variant="secondary" size="lg" className="w-full">
            <LogIn className="h-4 w-4" /> Intră
          </Button>
        </Card>

        <Button onClick={() => navigate("/history")} variant="ghost" className="w-full">
          <History className="h-4 w-4" /> Istoric trasee
        </Button>
      </div>
    </div>
  );
}
