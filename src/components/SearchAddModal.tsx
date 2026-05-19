import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { ClothingItem } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  title: string;
  brand: string;
  price: string;
  priceNumeric: number;
  imageUrl: string;
  productLink: string;
  source: string;
}

type SearchState = "idle" | "loading" | "results" | "empty" | "error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean }) => Promise<void> | void;
}

const DEBOUNCE_MS = 400;

export function SearchAddModal({ isOpen, onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [addingId, setAddingId] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = async (q: string) => {
    if (!q) { setSearchState("idle"); setResults([]); return; }
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
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
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("[SearchAddModal] search failed:", err);
      setSearchState("error");
    }
  };

  // Debounced auto-search as user types
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) { setSearchState("idle"); setResults([]); return; }
    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(query.trim());
    }
  };

  const handleAdd = async (result: SearchResult) => {
    const key = result.productLink || result.title;
    if (addingId) return;
    setAddingId(key);
    try {
      await onAdd(
        {
          id: crypto.randomUUID(),
          name: result.title,
          category: "",
          color: "",
          fabric: "",
          imageUrl: result.imageUrl,
          tags: result.brand ? [result.brand.toLowerCase()] : [],
          notes: result.source ? `Source: ${result.source}` : "",
          addedAt: new Date(),
          estimatedPrice: result.priceNumeric || undefined,
          isPrivate: false,
        } as ClothingItem,
        { runBackgroundRemoval: false }
      );
      toast({ title: "Added to wardrobe!" });
      handleClose();
    } catch (err) {
      console.error("[SearchAddModal] add failed:", err);
      toast({ title: "Couldn't add item", description: "Please try again.", variant: "destructive" });
    } finally {
      setAddingId(null);
    }
  };

  const handleClose = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setAddingId(null);
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
            onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); runSearch(query.trim()); }}
            disabled={!query.trim() || searchState === "loading"}
            className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 px-3"
          >
            {searchState === "loading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
          </Button>
        </div>

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
                const isAdding = addingId === key;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!!addingId}
                    onClick={() => handleAdd(result)}
                    className="relative rounded-2xl bg-card border border-border overflow-hidden text-left hover:border-accent transition-colors disabled:opacity-60"
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
                    {isAdding && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
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
