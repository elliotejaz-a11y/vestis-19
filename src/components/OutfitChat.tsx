import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Outfit } from "@/types/wardrobe";
import { Send, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

function renderBoldText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

interface Props {
  outfit: Outfit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Message = { role: "user" | "assistant"; content: string };

export function OutfitChat({ outfit, open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `I styled this ${outfit.occasion} look for you! ${outfit.reasoning}\n\nFeel free to ask me about color changes, swaps, or styling tips.`,
      }]);
    }
  }, [open]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom) scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsStreaming(true);

    let assistantContent = "";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be signed in to chat.");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outfit-chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          outfitContext: {
            occasion: outfit.occasion,
            items: outfit.items.map((i) => ({ name: i.name, category: i.category, color: i.color, fabric: i.fabric })),
            reasoning: outfit.reasoning,
            styleTips: outfit.styleTips,
          },
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > allMessages.length) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
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

        <div className="relative flex-1 overflow-hidden">
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-xs font-medium shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <ChevronDown className="w-3.5 h-3.5" /> Latest
          </button>
        )}
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border/40 text-foreground"
                )}
              >
                {renderBoldText(msg.content)}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/40 rounded-2xl px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="px-5 py-3 pb-24 border-t border-border/40 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about colors, swaps, styling..."
            className="rounded-xl bg-card text-sm"
            disabled={isStreaming}
          />
          <Button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
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
