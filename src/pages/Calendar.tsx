import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, X, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Outfit } from "@/types/wardrobe";
import { OutfitCard } from "@/components/OutfitCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore } from "date-fns";

interface Props {
  outfits: Outfit[];
}

export function CalendarPage({ outfits }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [plannedOutfits, setPlannedOutfits] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPlanned = async () => {
      const { data } = await supabase.from("planned_outfits").select("*").eq("user_id", user.id);
      setPlannedOutfits(data || []);
    };
    fetchPlanned();
  }, [user]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const getPlannedForDate = (date: Date) =>
    plannedOutfits.filter((p) => p.planned_date === format(date, "yyyy-MM-dd"));
  const getOutfitById = (id: string) => outfits.find((o) => o.id === id);

  const handleAssignOutfit = async (outfitId: string) => {
    if (!user || !selectedDate) return;
    setAssigning(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("planned_outfits")
        .insert({ user_id: user.id, outfit_id: outfitId, planned_date: dateStr })
        .select()
        .single();
      if (error) throw error;
      setPlannedOutfits((prev) => [...prev, data]);
      toast({ title: "Outfit planned! 📅" });
    } catch {
      toast({ title: "Failed to plan outfit", variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleMarkWorn = async (plannedId: string) => {
    await supabase.from("planned_outfits").update({ worn: true } as any).eq("id", plannedId);
    setPlannedOutfits((prev) => prev.map((p) => (p.id === plannedId ? { ...p, worn: true } : p)));
    toast({ title: "Marked as worn ✓" });
  };

  const handleUnmarkWorn = async (plannedId: string) => {
    await supabase.from("planned_outfits").update({ worn: false } as any).eq("id", plannedId);
    setPlannedOutfits((prev) => prev.map((p) => (p.id === plannedId ? { ...p, worn: false } : p)));
    toast({ title: "Unmarked as worn" });
  };

  const handleRemovePlan = async (plannedId: string) => {
    await supabase.from("planned_outfits").delete().eq("id", plannedId);
    setPlannedOutfits((prev) => prev.filter((p) => p.id !== plannedId));
    toast({ title: "Plan removed" });
  };

  const handleCreateOutfit = () => {
    if (!selectedDate) return;
    navigate(`/outfits?planDate=${format(selectedDate, "yyyy-MM-dd")}`);
  };

  const selectedPlanned = selectedDate ? getPlannedForDate(selectedDate) : [];

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outfit Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Plan looks & track what you've worn</p>
      </header>

      <div className="px-5 flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-sm font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-5">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;
            const planned = getPlannedForDate(day);
            const hasPlanned = planned.length > 0;
            const hasWorn = planned.some((p: any) => p.worn);
            const isPast = isBefore(day, new Date()) && !isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all relative",
                  isSelected ? "bg-accent text-accent-foreground" :
                  isToday(day) ? "bg-accent/20 text-foreground" :
                  isPast ? "text-muted-foreground/50" : "text-foreground hover:bg-muted"
                )}
              >
                {day.getDate()}
                {hasPlanned && (
                  <div className={cn("w-1.5 h-1.5 rounded-full absolute bottom-1", hasWorn ? "bg-accent/70" : "bg-accent")} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="px-5 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{format(selectedDate, "EEEE, MMMM d")}</p>
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={handleCreateOutfit}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Outfit
            </Button>
          </div>

          {selectedPlanned.length > 0 ? (
            <div className="space-y-3">
              {selectedPlanned.map((planned: any) => {
                const outfit = getOutfitById(planned.outfit_id);
                if (!outfit) return null;
                return (
                  <div key={planned.id}>
                    <OutfitCard outfit={outfit} />
                    <div className="flex gap-2 mt-2">
                      {!planned.worn ? (
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => handleMarkWorn(planned.id)}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark as Worn
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => handleUnmarkWorn(planned.id)}>
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> Unmark Worn
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive" onClick={() => handleRemovePlan(planned.id)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                    {planned.worn && <p className="text-[11px] text-accent font-medium mt-1">✓ Worn</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">No outfit planned. Assign one or create a new outfit:</p>
              {outfits.length === 0 ? (
                <p className="text-xs text-muted-foreground">Generate some outfits first!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {outfits.map((outfit) => (
                    <button
                      key={outfit.id}
                      onClick={() => handleAssignOutfit(outfit.id)}
                      disabled={assigning}
                      className="w-full rounded-xl bg-card border border-border/40 p-3 text-left hover:border-accent/50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-foreground">{outfit.occasion}</p>
                      <div className="flex gap-1 mt-1">
                        {outfit.items.slice(0, 4).map((item) => (
                          <div key={item.id} className="w-8 h-8 rounded-lg overflow-hidden bg-muted">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
