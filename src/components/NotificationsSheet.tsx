import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Users, Check, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: Props) {
  const { notifications, markAsRead, markAllAsRead, loading, refresh } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();

  // Track handled follow requests locally - rewritten from scratch
  const [handledRequests, setHandledRequests] = useState<Record<string, "accepted" | "declined">>({});

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_request": return <Users className="w-4 h-4 text-accent" />;
      case "follow_accepted": return <Check className="w-4 h-4 text-accent" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Accept follow request - rewritten from scratch
  const handleAcceptRequest = async (notification: any) => {
    if (!user || !notification.from_user_id) return;
    try {
      // Update follow_requests status to accepted
      await supabase
        .from("follow_requests")
        .update({ status: "accepted" } as any)
        .eq("requester_id", notification.from_user_id)
        .eq("target_id", user.id)
        .eq("status", "pending");

      // Insert into follows table
      await supabase.from("follows").insert({
        follower_id: notification.from_user_id,
        following_id: user.id,
      } as any);

      // Send accepted notification via RPC
      await supabase.rpc("notify_follow_accepted", {
        accepter_id: user.id,
        requester_id: notification.from_user_id,
      });

      setHandledRequests(prev => ({ ...prev, [notification.id]: "accepted" }));
      markAsRead(notification.id);
    } catch {
      toast({ title: "Error accepting request", variant: "destructive" });
    }
  };

  // Decline follow request - rewritten from scratch
  const handleDeclineRequest = async (notification: any) => {
    if (!user || !notification.from_user_id) return;
    try {
      // Update follow_requests status to rejected
      await supabase
        .from("follow_requests")
        .update({ status: "rejected" } as any)
        .eq("requester_id", notification.from_user_id)
        .eq("target_id", user.id)
        .eq("status", "pending");

      setHandledRequests(prev => ({ ...prev, [notification.id]: "declined" }));
      markAsRead(notification.id);
    } catch {
      toast({ title: "Error declining request", variant: "destructive" });
    }
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
            notifications.map(n => {
              const handled = handledRequests[n.id];
              const isFollowRequest = n.type === "follow_request" && !handled;

              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && !isFollowRequest && markAsRead(n.id)}
                  className={cn(
                    "w-full flex flex-col gap-2 p-3 rounded-2xl text-left transition-colors",
                    n.read ? "bg-card" : "bg-accent/10 border border-accent/20"
                  )}
                >
                  <div className="flex items-start gap-3">
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
                    </div>
                    {!n.read && !isFollowRequest && <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />}
                  </div>

                  {/* Follow request action buttons - rewritten from scratch */}
                  {n.type === "follow_request" && (
                    handled ? (
                      <p className="text-xs text-muted-foreground pl-[52px]">
                        {handled === "accepted" ? "Accepted" : "Declined"}
                      </p>
                    ) : (
                      <div className="flex gap-2 pl-[52px]">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleAcceptRequest(n); }}
                          className="h-8 rounded-xl text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleDeclineRequest(n); }}
                          className="h-8 rounded-xl text-xs"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
