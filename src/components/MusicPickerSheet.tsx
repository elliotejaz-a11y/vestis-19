import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Music2, Search, Play, Pause, Check, X, Loader2 } from "lucide-react";

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
}

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl100?: string;
}

export function MusicPickerSheet({ open, onOpenChange, selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup audio on unmount / sheet close
  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [open]);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=20`
      );
      const json = await res.json();
      const tracks: MusicTrack[] = (json.results as ItunesResult[])
        .filter((r) => r.previewUrl)
        .map((r) => ({
          id: String(r.trackId),
          name: r.trackName,
          artist: r.artistName,
          previewUrl: r.previewUrl!,
          artworkUrl: (r.artworkUrl100 ?? "").replace("100x100", "60x60"),
        }));
      setResults(tracks);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const togglePreview = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.play().catch(() => {});
      audioRef.current.onended = () => setPlayingId(null);
    }
    setPlayingId(track.id);
  };

  const handleSelect = (track: MusicTrack) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect(track);
    onOpenChange(false);
  };

  const handleRemove = () => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl bg-background flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        <SheetHeader className="flex-shrink-0 pb-2">
          <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Music2 className="w-4 h-4 text-accent" />
            Add Music
          </SheetTitle>
        </SheetHeader>

        {/* Selected track banner */}
        {selected && (
          <div className="flex-shrink-0 flex items-center gap-3 px-1 py-2 rounded-xl bg-accent/10 border border-accent/20 mb-2">
            {selected.artworkUrl && (
              <img src={selected.artworkUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.artist}</p>
            </div>
            <button onClick={handleRemove} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Search bar */}
        <div className="flex-shrink-0 relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search songs, artists…"
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-accent/40"
            autoComplete="off"
            spellCheck={false}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto pb-safe pb-6 space-y-1">
          {results.length === 0 && !searching && query.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No results for "{query}"</p>
          )}
          {results.length === 0 && !searching && query.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Search for a song to add to your story</p>
          )}
          {results.map((track) => {
            const isPlaying = playingId === track.id;
            const isSelected = selected?.id === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors"
              >
                {/* Artwork */}
                <div className="relative flex-shrink-0 w-11 h-11">
                  {track.artworkUrl ? (
                    <img src={track.artworkUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info — tapping selects */}
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => handleSelect(track)}
                >
                  <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </button>

                {/* Preview / selected indicator */}
                {isSelected ? (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent-foreground" />
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePreview(track); }}
                    className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={isPlaying ? "Pause preview" : "Play preview"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-foreground" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-foreground" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
