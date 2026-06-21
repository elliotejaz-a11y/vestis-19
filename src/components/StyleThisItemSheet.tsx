import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, MapPin, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStyleThisItem } from '@/hooks/useStyleThisItem';
import { useWeather } from '@/hooks/useWeather';
import { useToast } from '@/hooks/use-toast';
import { StyledOutfitResultCard } from '@/components/StyledOutfitResultCard';
import type { ClothingItem, StyleOccasion, StyleDirection, WeatherContext } from '@/types/wardrobe';

interface Props {
  anchorItem: ClothingItem | null;
  wardrobeItems: ClothingItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Occasion config ───────────────────────────────────────────────────────────

const OCCASIONS: { value: StyleOccasion; label: string; emoji: string }[] = [
  { value: 'everyday_casual', label: 'Everyday', emoji: '🌤️' },
  { value: 'work_office', label: 'Work', emoji: '💼' },
  { value: 'date_night', label: 'Date Night', emoji: '🌙' },
  { value: 'formal_event', label: 'Formal', emoji: '🎩' },
  { value: 'outdoor_active', label: 'Active', emoji: '🏃' },
  { value: 'weekend_brunch', label: 'Brunch', emoji: '🥂' },
  { value: 'night_out', label: 'Night Out', emoji: '🎉' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
];

// ── Style direction config ────────────────────────────────────────────────────

const DIRECTIONS: {
  value: StyleDirection;
  label: string;
  sub: string;
  accent: string;
}[] = [
  { value: 'minimal_clean', label: 'Minimal', sub: 'Clean and restrained', accent: 'bg-neutral-100 border-neutral-300' },
  { value: 'streetwear_edge', label: 'Street', sub: 'Urban and edgy', accent: 'bg-zinc-900 border-zinc-700' },
  { value: 'smart_casual', label: 'Smart Casual', sub: 'Elevated basics', accent: 'bg-blue-50 border-blue-200' },
  { value: 'classic_tailored', label: 'Classic', sub: 'Timeless and structured', accent: 'bg-amber-50 border-amber-200' },
  { value: 'relaxed_luxe', label: 'Relaxed Luxe', sub: 'Premium but laid-back', accent: 'bg-stone-100 border-stone-300' },
  { value: 'bold_expressive', label: 'Bold', sub: 'Statement pieces', accent: 'bg-rose-50 border-rose-200' },
];

// ── Weather condition config ──────────────────────────────────────────────────

const CONDITIONS: { value: WeatherContext['condition']; label: string; emoji: string }[] = [
  { value: 'sunny', label: 'Sunny', emoji: '☀️' },
  { value: 'cloudy', label: 'Cloudy', emoji: '☁️' },
  { value: 'rainy', label: 'Rainy', emoji: '🌧️' },
  { value: 'windy', label: 'Windy', emoji: '💨' },
  { value: 'cold', label: 'Cold', emoji: '🥶' },
  { value: 'hot', label: 'Hot', emoji: '🌡️' },
];

const CONDITION_EMOJI: Record<WeatherContext['condition'], string> = {
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', windy: '💨', cold: '🥶', hot: '🌡️',
};

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
      <p className="text-sm text-destructive font-medium leading-snug">{message}</p>
    </div>
  );
}

// ── Manual weather input ──────────────────────────────────────────────────────

function ManualWeatherInput({
  value,
  onChange,
}: {
  value: WeatherContext | null;
  onChange: (w: WeatherContext) => void;
}) {
  const [temp, setTemp] = useState(value?.temperatureCelsius?.toString() ?? '');
  const [condition, setCondition] = useState<WeatherContext['condition']>(
    value?.condition ?? 'cloudy'
  );

  const handleTempChange = (raw: string) => {
    setTemp(raw);
    const t = parseInt(raw, 10);
    if (!isNaN(t)) onChange({ temperatureCelsius: t, condition });
  };

  const handleConditionChange = (c: WeatherContext['condition']) => {
    setCondition(c);
    const t = parseInt(temp, 10);
    if (!isNaN(t)) onChange({ temperatureCelsius: t, condition: c });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Thermometer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          type="number"
          placeholder="Temperature (°C)"
          value={temp}
          onChange={(e) => handleTempChange(e.target.value)}
          className="h-9 rounded-xl text-sm flex-1"
          min={-30}
          max={55}
        />
        <span className="text-sm text-muted-foreground">°C</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handleConditionChange(c.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              condition === c.value
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card text-muted-foreground border-border',
            )}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StyleThisItemSheet({ anchorItem, wardrobeItems, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const {
    occasion,
    styleDirection,
    weather,
    isGenerating,
    result,
    error,
    isSaved,
    openWithItem,
    setIsSheetOpen,
    setOccasion,
    setStyleDirection,
    setWeather,
    generate,
    saveOutfit,
    reset,
  } = useStyleThisItem(wardrobeItems);

  const {
    weather: autoWeather,
    loading: weatherLoading,
    geoError,
    manualOverride,
  } = useWeather();

  // Sync anchor item into hook when it changes
  useEffect(() => {
    if (anchorItem && open) {
      openWithItem(anchorItem);
    }
    // openWithItem is stable (useCallback). anchorItem object reference changes on
    // each wardrobe update, so we key only on id to avoid spurious resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorItem?.id, open]);

  // Sync isSheetOpen into hook
  useEffect(() => {
    setIsSheetOpen(open);
  }, [open, setIsSheetOpen]);

  // Auto-apply weather once it loads
  useEffect(() => {
    if (autoWeather && !weather) {
      setWeather(autoWeather);
    }
    // setWeather and weather are stable refs; autoWeather drives the update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWeather]);

  const handleManualWeather = (w: WeatherContext) => {
    manualOverride(w);
    setWeather(w);
  };

  const canGenerate = !!occasion && !!styleDirection && !!weather && !isGenerating;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveOutfit();
      toast({ title: 'Outfit saved! ✨' });
    } catch {
      toast({ title: 'Couldn\'t save outfit', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!anchorItem) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 pb-0 max-h-[92dvh] overflow-hidden flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Style This</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">

          {/* Anchor item preview */}
          <div className="flex items-center gap-4 bg-card rounded-2xl p-3 border border-border/40">
            <div className="w-[72px] h-[90px] rounded-xl overflow-hidden bg-white border border-border/30 shrink-0">
              {anchorItem.imageUrl ? (
                <img
                  src={anchorItem.imageUrl}
                  alt={anchorItem.name}
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {anchorItem.category === 'shoes' ? '👟' :
                   anchorItem.category === 'outerwear' ? '🧥' :
                   anchorItem.category === 'bottoms' ? '👖' : '👕'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{anchorItem.name}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {anchorItem.category}
              </p>
              {anchorItem.color && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div
                    className="w-3 h-3 rounded-full border border-border/40"
                    style={{ backgroundColor: anchorItem.color.toLowerCase().replace(/\s/g, '') }}
                  />
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {anchorItem.color}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error banner (non-fatal) */}
          {error && <ErrorBanner message={error} />}

          {/* Result view */}
          {result && !isGenerating ? (
            <StyledOutfitResultCard
              result={result}
              onTryAgain={reset}
              onSave={handleSave}
              isSaving={isSaving}
              isSaved={isSaved}
            />
          ) : (
            /* Form view */
            <>
              {/* Step 1: Occasion */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">What's the occasion?</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOccasion(o.value)}
                      className={cn(
                        'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                        occasion === o.value
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-card text-muted-foreground border-border',
                      )}
                    >
                      <span>{o.emoji}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Style direction */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Your style direction</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {DIRECTIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setStyleDirection(d.value)}
                      className={cn(
                        'flex flex-col items-start p-3 rounded-2xl border-2 text-left transition-all',
                        styleDirection === d.value
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-card',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg mb-2 border', d.accent)} />
                      <p className="text-xs font-semibold text-foreground leading-tight">{d.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{d.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Weather */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Today's weather</p>

                {weatherLoading && !weather && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Getting your weather...
                  </div>
                )}

                {weather && !geoError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 w-fit">
                    <span>{CONDITION_EMOJI[weather.condition]}</span>
                    <span className="text-sm font-medium text-foreground">
                      {weather.temperatureCelsius}°C
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      · {weather.condition}
                    </span>
                    <MapPin className="w-3 h-3 text-muted-foreground ml-1" />
                  </div>
                )}

                {geoError && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Location unavailable — enter weather manually:
                    </p>
                    <ManualWeatherInput
                      value={weather}
                      onChange={handleManualWeather}
                    />
                  </div>
                )}
              </div>

              {/* Generate button */}
              <Button
                className={cn(
                  'w-full rounded-xl py-6 text-base font-medium transition-all',
                  canGenerate
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
                disabled={!canGenerate}
                onClick={generate}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Styling your look...
                  </span>
                ) : (
                  'Generate Outfit'
                )}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
