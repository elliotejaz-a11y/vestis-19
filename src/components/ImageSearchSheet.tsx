import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export function ImageSearchOverlay({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-clothing-images", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      setResults(data?.images || []);
      if (!data?.images?.length) {
        toast({ title: "No results found", description: "Try a different search term." });
      }
    } catch (err) {
      console.error("Image search failed:", err);
      toast({ title: "Search failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background z-[10001] flex flex-col overflow-hidden">
      {/* Search header */}
      <div className="shrink-0 px-4 pt-12 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Search Clothing</h1>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="relative"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any clothing item..."
            className="pl-10 pr-10 h-12 rounded-2xl bg-card border-border text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-foreground" />
            </button>
          )}
        </form>
        {/* Quick suggestions */}
        {!hasSearched && (
          <div className="flex flex-wrap gap-1.5">
            {["Nike trainers", "Black hoodie", "White t-shirt", "Denim jacket", "Running shorts"].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); setTimeout(() => { handleSearch(); }, 0); }}
                className="px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium hover:bg-accent/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Searching state */}
        {searching && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm text-muted-foreground">Searching for images…</p>
          </div>
        )}

        {/* Results grid */}
        {!searching && results.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((result, i) => (
              <button
                key={i}
                onClick={() => onSelect(result.url)}
                className="relative aspect-square rounded-xl overflow-hidden border border-border hover:border-accent transition-all active:scale-[0.97]"
              >
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <p className="text-[9px] text-white/90 line-clamp-1 font-medium">{result.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty / initial state */}
        {!searching && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-accent/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Find any clothing item</p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center max-w-[240px]">
              Search for brands, styles, or specific items and add them straight to your wardrobe
            </p>
          </div>
        )}

        {/* No results state */}
        {!searching && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-medium text-foreground">No results found</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}
