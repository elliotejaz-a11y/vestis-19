import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Check, X } from "lucide-react";
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
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAcceptFollow = async (notificationId: string, requesterId: string) => {
    if (!user) return;
    setProcessing(notificationId);
    try {
      // Create the follow relationship
      await supabase.from("follows").insert({ follower_id: requesterId, following_id: user.id } as any);
      // Delete the follow request
      await supabase.from("follow_requests").delete().match({ requester_id: requesterId, target_id: user.id });
      // Send accepted notification via RPC
      await supabase.rpc("notify_follow_accepted", { accepter_id: user.id, requester_id: requesterId });
      // Mark this notification as read
      await markAsRead(notificationId);
      toast({ title: "Follow request accepted" });
      await refresh();
    } catch (e) {
      toast({ title: "Error", description: "Failed to accept request", variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleDeclineFollow = async (notificationId: string, requesterId: string) => {
    if (!user) return;
    setProcessing(notificationId);
    try {
      await supabase.from("follow_requests").delete().match({ requester_id: requesterId, target_id: user.id });
      await markAsRead(notificationId);
      toast({ title: "Follow request declined" });
      await refresh();
    } catch (e) {
      toast({ title: "Error", description: "Failed to decline request", variant: "destructive" });
    }
    setProcessing(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_request": return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_accepted": return <Check className="w-4 h-4 text-accent" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
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
                  {n.type === "follow_request" && !n.read && n.from_user_id && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-7 rounded-xl text-xs bg-accent text-accent-foreground"
                        disabled={processing === n.id}
                        onClick={() => handleAcceptFollow(n.id, n.from_user_id!)}
                      >
                        <Check className="w-3 h-3 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-xl text-xs"
                        disabled={processing === n.id}
                        onClick={() => handleDeclineFollow(n.id, n.from_user_id!)}
                      >
                        <X className="w-3 h-3 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
                {!n.read && n.type !== "follow_request" && (
                  <button onClick={() => markAsRead(n.id)} className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
