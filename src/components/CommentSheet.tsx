import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { SocialComment } from "@/hooks/useSocial";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  initialCount: number;
}

export function CommentSheet({ open, onOpenChange, postId, initialCount }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("social_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(async ({ data }) => {
        if (cancelled) return;
        if (!data || data.length === 0) {
          setComments([]);
          setLoading(false);
          return;
        }
        const userIds = [...new Set(data.map((c: any) => c.user_id as string))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, avatar_preset")
          .in("id", userIds);
        if (cancelled) return;
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const enriched: SocialComment[] = data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          post_id: c.post_id,
          content: c.content,
          created_at: c.created_at,
          user: profileMap.get(c.user_id),
        }));
        setComments(enriched);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, postId]);

  const handleSubmit = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("social_comments")
        .insert({ post_id: postId, user_id: user.id, content: text.trim() } as any)
        .select()
        .single();
      if (error) throw error;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_preset")
        .eq("id", user.id)
        .single();

      const newComment: SocialComment = {
        id: data.id,
        user_id: data.user_id,
        post_id: data.post_id,
        content: data.content,
        created_at: data.created_at,
        user: profileData ?? undefined,
      };
      setComments((prev) => [...prev, newComment]);
      setText("");

      const newCount = comments.length + 1;
      await supabase
        .from("social_posts")
        .update({ comments_count: newCount } as any)
        .eq("id", postId);

      queryClient.setQueryData(["social-posts", user.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) =>
              p.id === postId ? { ...p, comments_count: newCount } : p
            ),
          })),
        };
      });
    } catch {
      toast({ title: "Failed to post comment", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-sm">Comments</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <UserAvatar
                  avatarUrl={comment.user?.avatar_url ?? null}
                  avatarPreset={comment.user?.avatar_preset ?? null}
                  displayName={comment.user?.display_name ?? null}
                  userId={comment.user_id}
                  className="w-7 h-7 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold mr-1">
                      {comment.user?.username || comment.user?.display_name || "User"}
                    </span>
                    {comment.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        {user && (
          <div className="flex gap-2 px-5 py-3 border-t border-border/40">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSubmit();
              }}
              placeholder="Add a comment..."
              className="rounded-xl bg-muted text-sm"
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="rounded-xl h-9 w-9 bg-accent text-accent-foreground flex-shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
