import { useState, useEffect } from "react";
import { MessageSquare, Bug, HelpCircle, ThumbsUp, Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type FeedbackType = "idea" | "bug" | "help";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  votes: number;
  user_id: string;
  created_at: string;
  hasVoted?: boolean;
}

const TYPE_CONFIG = {
  idea: { icon: Lightbulb, label: "Idea", color: "text-yellow-500" },
  bug: { icon: Bug, label: "Bug", color: "text-destructive" },
  help: { icon: HelpCircle, label: "Help", color: "text-blue-500" },
};

export function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<FeedbackType | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newType, setNewType] = useState<FeedbackType>("idea");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  const fetchFeedback = async () => {
    if (!user) return;
    const { data: feedbackData } = await supabase.from("feedback").select("*").order("votes", { ascending: false });
    const { data: votesData } = await supabase.from("feedback_votes").select("feedback_id").eq("user_id", user.id);
    const votedIds = new Set((votesData || []).map((v: any) => v.feedback_id));
    setItems((feedbackData || []).map((f: any) => ({ ...f, hasVoted: votedIds.has(f.id) })));
  };

  const handleSubmit = async () => {
    if (!user || !newTitle.trim()) return;
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id, type: newType, title: newTitle.trim(), description: newDesc.trim(),
    });
    if (error) { toast({ title: "Failed to submit", variant: "destructive" }); return; }
    toast({ title: "Feedback submitted! 🎉" });
    setNewTitle(""); setNewDesc(""); setSheetOpen(false);
    fetchFeedback();
  };

  const handleVote = async (feedbackId: string, hasVoted: boolean) => {
    if (!user) return;
    if (hasVoted) {
      await supabase.from("feedback_votes").delete().eq("feedback_id", feedbackId).eq("user_id", user.id);
      await supabase.rpc('decrement_feedback_votes', { feedback_id_param: feedbackId });
    } else {
      await supabase.from("feedback_votes").insert({ feedback_id: feedbackId, user_id: user.id });
      await supabase.rpc('increment_feedback_votes', { feedback_id_param: feedbackId });
    }
    fetchFeedback();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Help & Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Have an idea? Found a bug? Need help?</p>
      </header>

      <div className="px-5 flex gap-2 pb-4">
        {(["all", "idea", "bug", "help"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              filter === t ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
            )}
          >
            {t === "all" ? "All" : TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-3">
        {filtered.map((item) => {
          const config = TYPE_CONFIG[item.type];
          const Icon = config.icon;
          return (
            <div key={item.id} className="rounded-2xl bg-card border border-border/40 p-4">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleVote(item.id, !!item.hasVoted)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    item.hasVoted ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-accent/20"
                  )}
                >
                  <ThumbsUp className="w-3 h-3" /> {item.votes}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No feedback yet. Be the first!</p>
        )}
      </div>

      <div className="fixed bottom-20 right-4 z-40">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button className="rounded-full w-12 h-12 bg-accent text-accent-foreground shadow-lg">
              <Plus className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl bg-background pb-24">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Share Feedback</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                {(["idea", "bug", "help"] as FeedbackType[]).map((t) => {
                  const config = TYPE_CONFIG[t];
                  const Icon = config.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
                        newType === t ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" /> {config.label}
                    </button>
                  );
                })}
              </div>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="rounded-xl bg-card" />
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe in detail..." className="rounded-xl bg-card min-h-[80px]" />
              <Button onClick={handleSubmit} disabled={!newTitle.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold">
                Submit Feedback
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default FeedbackPage;
