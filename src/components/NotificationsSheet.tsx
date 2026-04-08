import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Check, X, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: Props) {
  const { notifications, markAsRead, markAllAsRead, loading, refresh } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_request": return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_accepted": return <Check className="w-4 h-4 text-accent" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleAcceptFollow = async (notification: any) => {
    if (!user || !notification.from_user_id) return;
    setProcessingIds(prev => new Set(prev).add(notification.id));

    // Find the pending follow request
    const { data: request } = await supabase
      .from("follow_requests")
      .select("id")
      .eq("requester_id", notification.from_user_id)
      .eq("target_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (request) {
      // Create the follow relationship
      await supabase.from("follows").insert({
        follower_id: notification.from_user_id,
        following_id: user.id,
      } as any);

      // Update request status
      await supabase.from("follow_requests").update({ status: "accepted" } as any).eq("id", request.id);

      // Notify the requester
      await supabase.rpc("notify_follow_accepted", {
        accepter_id: user.id,
        requester_id: notification.from_user_id,
      });

      // Mark this notification as read
      await markAsRead(notification.id);
      toast({ title: "Follow request accepted" });
    }

    setProcessingIds(prev => { const s = new Set(prev); s.delete(notification.id); return s; });
    refresh();
  };

  const handleDeclineFollow = async (notification: any) => {
    if (!user || !notification.from_user_id) return;
    setProcessingIds(prev => new Set(prev).add(notification.id));

    await supabase
      .from("follow_requests")
      .delete()
      .eq("requester_id", notification.from_user_id)
      .eq("target_id", user.id)
      .eq("status", "pending");

    await markAsRead(notification.id);
    toast({ title: "Follow request declined" });
    setProcessingIds(prev => { const s = new Set(prev); s.delete(notification.id); return s; });
    refresh();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto bg-background pb-24">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold tracking-tight">Notifications</SheetTitle>
            {notifications.some(n => !n.read) && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-accent">
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-colors",
                  n.read ? "bg-card" : "bg-accent/10 border border-accent/20"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {n.from_profile?.avatar_url ? (
                    <img src={n.from_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getIcon(n.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                  {n.type === "follow_request" && !n.read && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptFollow(n)}
                        disabled={processingIds.has(n.id)}
                        className="h-7 px-3 rounded-xl bg-accent text-accent-foreground text-xs"
                      >
                        {processingIds.has(n.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineFollow(n)}
                        disabled={processingIds.has(n.id)}
                        className="h-7 px-3 rounded-xl text-xs"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
                {!n.read && n.type !== "follow_request" && (
                  <button onClick={() => markAsRead(n.id)}>
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
