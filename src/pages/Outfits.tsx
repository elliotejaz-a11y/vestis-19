import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Cloud, Sun, CloudRain, Snowflake, ArrowLeft, Layers, Lightbulb, MessageCircle, Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OutfitCard } from "@/components/OutfitCard";
import { OutfitChat } from "@/components/OutfitChat";
import { ClothingItem, Outfit, OCCASIONS } from "@/types/wardrobe";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { sortItemsHeadToToe } from "@/lib/outfit-display";

interface Props {
  items: ClothingItem[];
  outfits: Outfit[];
  onGenerate: (occasion: string, weather?: { temp: number; description: string }) => Promise<Outfit | null>;
  onSave?: (id: string, saved: boolean, name?: string, description?: string) => void;
  onDelete?: (id: string) => void;
}

export function Outfits({ items, outfits, onGenerate, onSave, onDelete }: Props) {
  const { user } = useAuth();
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [customOccasion, setCustomOccasion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [latestOutfit, setLatestOutfit] = useState<Outfit | null>(null);
  const [popupOutfit, setPopupOutfit] = useState<Outfit | null>(null);
  const [chatOutfit, setChatOutfit] = useState<Outfit | null>(null);
  const [weather, setWeather] = useState<{ temp: number; description: string } | null>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planDate = searchParams.get("planDate");

  const activeOccasion = customOccasion.trim() || selectedOccasion;

  // Fetch weather
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const data = await resp.json();
          const code = data.current.weather_code;
          const temp = Math.round(data.current.temperature_2m);
          const description = code <= 3 ? "Clear" : code <= 48 ? "Cloudy" : code <= 67 ? "Rainy" : "Snowy";
          setWeather({ temp, description });
        } catch {}
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const WeatherIcon = weather?.description === "Rainy" ? CloudRain
    : weather?.description === "Snowy" ? Snowflake
    : weather?.description === "Cloudy" ? Cloud : Sun;

  const handleGenerate = async () => {
    if (!activeOccasion || items.length < 2) return;
    setGenerating(true);
    try {
      const outfit = await onGenerate(activeOccasion, weather || undefined);
      setLatestOutfit(outfit);
      if (outfit) {
        setPopupOutfit(outfit);
        toast({ title: "Outfit Created ✨", description: `Perfect look for "${activeOccasion}"` });

        // Auto-plan if coming from calendar
        if (planDate && user) {
          await supabase.from("planned_outfits").insert({
            user_id: user.id,
            outfit_id: outfit.id,
            planned_date: planDate,
          });
          toast({ title: "Outfit planned for calendar! 📅" });
          setTimeout(() => navigate("/calendar"), 1500);
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate outfit", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        {planDate && (
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-xs" onClick={() => navigate("/calendar")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Calendar
          </Button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Outfit Generator</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {planDate ? `Creating outfit for ${planDate}` : "AI-styled looks for every occasion"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-xs h-9" onClick={() => navigate("/builder")}>
            <Layers className="w-3.5 h-3.5 mr-1" /> Builder
          </Button>
        </div>
      </header>

      {/* Weather badge */}
      {weather && (
        <div className="px-5 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/40 text-xs text-muted-foreground">
            <WeatherIcon className="w-3.5 h-3.5" />
            <span>{weather.temp}°C · {weather.description}</span>
            <span className="text-[10px]">— AI will factor this in</span>
          </div>
        </div>
      )}

      {/* Custom occasion input */}
      <div className="px-5 pb-3">
        <Input
          value={customOccasion}
          onChange={(e) => { setCustomOccasion(e.target.value); if (e.target.value) setSelectedOccasion(""); }}
          placeholder="Type your own occasion..."
          className="rounded-xl bg-card text-sm"
        />
      </div>

      {/* Occasion selector */}
      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Or choose one:</p>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((occ) => (
            <button
              key={occ}
              onClick={() => { setSelectedOccasion(occ); setCustomOccasion(""); }}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedOccasion === occ && !customOccasion
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-accent/50"
              )}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="px-5 mb-6">
        <Button
          onClick={handleGenerate}
          disabled={!activeOccasion || items.length < 2 || generating}
          className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI is styling your look...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Generate Outfit</>
          )}
        </Button>
        {items.length < 2 && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">Add at least 2 items to your wardrobe first</p>
        )}
      </div>

      {/* Results */}
      <div className="px-5 space-y-4">
        {latestOutfit && outfits.some(o => o.id === latestOutfit.id) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Latest Suggestion</p>
            <OutfitCard outfit={latestOutfit} onSave={onSave} onDelete={(id) => { if (id === latestOutfit?.id) setLatestOutfit(null); onDelete?.(id); }} onChat={setChatOutfit} />
          </div>
        )}
        {outfits.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Previous Outfits</p>
            <div className="space-y-3">
              {outfits
                .filter((o) => o.id !== latestOutfit?.id)
                .map((outfit) => (
                  <OutfitCard key={outfit.id} outfit={outfit} onSave={onSave} onDelete={onDelete} onChat={setChatOutfit} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated outfit popup */}
      <Dialog open={!!popupOutfit} onOpenChange={(open) => { if (!open) setPopupOutfit(null); }}>
        <DialogContent className="max-w-[92vw] rounded-3xl p-0 overflow-hidden border-border/40 gap-0 max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Generated Outfit</DialogTitle>
          {popupOutfit && (() => {
              const sorted = sortItemsHeadToToe(popupOutfit.items);

              return (
            <>
              {/* Head-to-toe preview */}
              <div className="bg-muted dark:bg-neutral-800 p-4">
                <div className="flex flex-col items-center gap-y-1">
                  {sorted.map((item) => {
                    const sizeClass = ITEM_MAX_SIZE[item.category] || "max-h-28 w-28";
                    return (
                      <div key={item.id} className={cn("flex-shrink-0", sizeClass)}>
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="text-base font-bold text-foreground">{popupOutfit.occasion}</h3>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{popupOutfit.reasoning}</p>

                {popupOutfit.styleTips && (
                  <div className="flex items-start gap-2 bg-accent/10 rounded-xl p-3">
                    <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-foreground leading-relaxed">{popupOutfit.styleTips}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs h-10"
                    onClick={() => {
                      const o = popupOutfit;
                      setPopupOutfit(null);
                      setTimeout(() => setChatOutfit(o), 200);
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Chat about it
                  </Button>
                  <Button
                    className="flex-1 rounded-xl text-xs h-10 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => {
                      onSave?.(popupOutfit.id, true);
                      setPopupOutfit(null);
                    }}
                  >
                    <Bookmark className="w-3.5 h-3.5 mr-1.5" /> Save Outfit
                  </Button>
                </div>
              </div>
            </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Chat sheet */}
      {chatOutfit && (
        <OutfitChat outfit={chatOutfit} open={!!chatOutfit} onOpenChange={(open) => !open && setChatOutfit(null)} />
      )}
    </div>
  );
}

export default Outfits;
