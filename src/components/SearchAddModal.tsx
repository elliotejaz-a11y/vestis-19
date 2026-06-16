import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { ClothingItem } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useSearchQueue, SearchResult } from "@/contexts/SearchQueueContext";

type SearchState = "idle" | "loading" | "results" | "empty" | "error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean }) => Promise<void> | void;
}

export function SearchAddModal({ isOpen, onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [queuedKeys, setQueuedKeys] = useState<Set<string>>(new Set());
  const searchingRef = useRef(false);
  const { addToQueue, queue } = useSearchQueue();

  const sessionProcessing = queue.filter((q) => q.status === "processing" || q.status === "pending").length;

  const runSearch = async (q: string) => {
    if (!q || searchingRef.current) return;
    searchingRef.current = true;
    setSearchState("loading");
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-clothes", {
        body: { query: q },
      });
      if (error) throw error;
      const items: SearchResult[] = data?.results || [];
      setResults(items);
      setSearchState(items.length > 0 ? "results" : "empty");
    } catch (err) {
      console.error("[SearchAddModal] search failed:", err);
      setSearchState("error");
    } finally {
      searchingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") runSearch(query.trim());
  };

  const handleAdd = (result: SearchResult) => {
    const key = result.productLink || result.title;
    if (queuedKeys.has(key)) return;
    setQueuedKeys((prev) => new Set(prev).add(key));
    addToQueue(result, onAdd);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setQueuedKeys(new Set());
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background px-5 pb-32 pt-6"
        style={{ zIndex: 10000 }}
      >
        <SheetHeader className="text-left">
          <SheetTitle className="tracking-tight">Search & Add</SheetTitle>
        </SheetHeader>

        <div className="mt-5 flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a clothing item..."
            className="rounded-xl bg-card flex-1"
            autoFocus={false}
          />
          <Button
            onClick={() => runSearch(query.trim())}
            disabled={!query.trim() || searchState === "loading"}
            className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 px-3"
          >
            {searchState === "loading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {sessionProcessing > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Analysing {sessionProcessing} item{sessionProcessing > 1 ? "s" : ""}…
              </p>
              <p className="text-[11px] text-muted-foreground">Keep searching — we'll notify you when done</p>
            </div>
          </div>
        )}

        <div className="mt-5">
          {searchState === "idle" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Type to search for any clothing item</p>
            </div>
          )}

          {searchState === "loading" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground mt-3">Searching...</p>
            </div>
          )}

          {searchState === "empty" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">No results found.</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search.</p>
            </div>
          )}

          {searchState === "error" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">Search unavailable right now.</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
            </div>
          )}

          {searchState === "results" && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((result, i) => {
                const key = result.productLink || result.title;
                const isQueued = queuedKeys.has(key);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAdd(result)}
                    className="relative rounded-2xl bg-card border border-border overflow-hidden text-left hover:border-accent transition-colors"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      <img
                        src={result.imageUrl}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">
                        {result.title}
                      </p>
                      {result.price ? (
                        <p className="text-[11px] font-semibold text-accent mt-1">{result.price}</p>
                      ) : null}
                      {result.source ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{result.source}</p>
                      ) : null}
                    </div>
                    {isQueued && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-accent" />
                        <p className="text-[10px] font-medium text-foreground">Queued</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
