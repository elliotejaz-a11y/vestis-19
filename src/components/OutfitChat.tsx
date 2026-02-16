import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Outfit, ClothingItem } from "@/types/wardrobe";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  outfit: Outfit;
  wardrobeItems: ClothingItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OutfitPreview = {
  items: ClothingItem[];
  explanation: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  outfitPreview?: OutfitPreview;
};

const CATEGORY_ORDER = ["accessories", "outerwear", "tops", "dresses", "bottoms", "shoes"];

function MiniOutfitDisplay({ items }: { items: ClothingItem[] }) {
  const sorted = [...items].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return (
    <div className="bg-white rounded-xl p-3 my-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {sorted.map((item) => {
          const isShoes = item.category === "shoes";
          const isAccessory = item.category === "accessories";
          const size = isShoes || isAccessory ? "w-12 h-12" : "w-16 h-16";
          return (
            <div key={item.id} className={cn("flex-shrink-0 flex flex-col items-center", size)}>
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-1 mt-2">
        {sorted.map((item) => (
          <span key={item.id} className="text-[9px] text-muted-foreground bg-muted/50 rounded-full px-1.5 py-0.5">
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OutfitChat({ outfit, wardrobeItems, open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `I styled this ${outfit.occasion} look for you! ${outfit.reasoning}\n\nFeel free to ask me about color changes, swaps, or styling tips.`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const resolveOutfitPreview = (toolArgs: any): OutfitPreview | undefined => {
    const outfitIndices: number[] = toolArgs.outfit_item_indices || [];
    const wardrobeIndices: number[] = toolArgs.wardrobe_item_indices || [];
    
    const previewItems: ClothingItem[] = [];
    
    for (const idx of outfitIndices) {
      if (idx >= 1 && idx <= outfit.items.length) {
        previewItems.push(outfit.items[idx - 1]);
      }
    }
    for (const idx of wardrobeIndices) {
      if (idx >= 1 && idx <= wardrobeItems.length) {
        previewItems.push(wardrobeItems[idx - 1]);
      }
    }

    if (previewItems.length === 0) return undefined;

    return {
      items: previewItems,
      explanation: toolArgs.explanation || '',
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outfit-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          outfitContext: {
            occasion: outfit.occasion,
            items: outfit.items.map((i) => ({ name: i.name, category: i.category, color: i.color, fabric: i.fabric })),
            reasoning: outfit.reasoning,
            styleTips: outfit.styleTips,
            wardrobeItems: wardrobeItems.map((i) => ({ name: i.name, category: i.category, color: i.color, fabric: i.fabric })),
          },
        }),
      });

      if (!resp.ok) throw new Error("Request failed");

      const data = await resp.json();
      
      // Build assistant message with optional outfit preview
      let outfitPreview: OutfitPreview | undefined;
      
      if (data.toolCalls?.length > 0) {
        for (const tc of data.toolCalls) {
          if (tc.name === 'show_outfit') {
            outfitPreview = resolveOutfitPreview(tc.args);
          }
        }
      }

      const assistantContent = data.content || outfitPreview?.explanation || "Here's my suggestion!";
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: assistantContent,
        outfitPreview,
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[80vh] flex flex-col bg-background p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Chat about this outfit
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border/40 text-foreground"
                )}
              >
                {msg.content}
              </div>
              {msg.outfitPreview && (
                <div className="max-w-[85%] mt-1">
                  <MiniOutfitDisplay items={msg.outfitPreview.items} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/40 rounded-2xl px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/40 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about colors, swaps, styling..."
            className="rounded-xl bg-card text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="rounded-xl bg-accent text-accent-foreground shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
