import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Check, X, UserCheck } from "lucide-react";
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
  const { notifications, markAsRead, markAllAsRead, loading, refresh, clearAll } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());
  const [followingBack, setFollowingBack] = useState<Set<string>>(new Set());
  const [alreadyFollowing, setAlreadyFollowing] = useState<Set<string>>(new Set());

  // Check which requesters we already follow
  useEffect(() => {
    if (!user || !open) return;
    const requestNotifs = notifications.filter(n => n.type === "follow_request" && n.from_user_id);
    const fromIds = [...new Set(requestNotifs.map(n => n.from_user_id!))];
    if (fromIds.length === 0) return;

    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", fromIds)
      .then(({ data }) => {
        if (data) {
          setAlreadyFollowing(new Set(data.map(f => f.following_id)));
        }
      });
  }, [user, open, notifications]);

  const handleAcceptFollow = async (notificationId: string, requesterId: string) => {
    if (!user) return;
    setProcessing(notificationId);
    try {
      const { error } = await supabase.rpc("accept_follow_request", {
        request_notification_id: notificationId,
        request_requester_id: requesterId,
      });
      if (error) throw error;
      setAcceptedIds(prev => new Set(prev).add(notificationId));
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
      setDeclinedIds(prev => new Set(prev).add(notificationId));
      toast({ title: "Follow request declined" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to decline request", variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleFollowBack = async (notificationId: string, targetUserId: string) => {
    if (!user) return;
    setProcessing(notificationId);
    try {
      // Check if target is private
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", targetUserId)
        .single();

      if (targetProfile && !targetProfile.is_public) {
        // Send follow request instead
        await supabase.from("follow_requests").insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: "pending",
        } as any);
        await supabase.rpc("notify_follow_request", { requester_id: user.id, target_id: targetUserId });
        toast({ title: "Follow request sent" });
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId } as any);
        toast({ title: "Now following back!" });
      }
      setFollowingBack(prev => new Set(prev).add(notificationId));
      setAlreadyFollowing(prev => new Set(prev).add(targetUserId));
    } catch (e) {
      toast({ title: "Error", description: "Failed to follow back", variant: "destructive" });
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

  const renderFollowRequestActions = (n: typeof notifications[0]) => {
    if (n.type !== "follow_request" || !n.from_user_id) return null;

    const isAccepted = acceptedIds.has(n.id);
    const isDeclined = declinedIds.has(n.id);

    if (isDeclined) {
      return (
        <p className="text-xs text-muted-foreground mt-2">Request declined</p>
      );
    }

    if (isAccepted) {
      const alreadyFollows = alreadyFollowing.has(n.from_user_id) || followingBack.has(n.id);
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" /> Accepted
          </span>
          {!alreadyFollows && (
            <Button
              size="sm"
              className="h-7 rounded-xl text-xs bg-accent text-accent-foreground"
              disabled={processing === n.id}
              onClick={() => handleFollowBack(n.id, n.from_user_id!)}
            >
              <UserPlus className="w-3 h-3 mr-1" /> Follow Back
            </Button>
          )}
          {alreadyFollows && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Following
            </span>
          )}
        </div>
      );
    }

    // Show accept/decline only if not yet actioned (unread or still pending)
    if (!n.read) {
      return (
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
      );
    }

    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto bg-background pb-24">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold tracking-tight">Notifications</SheetTitle>
            <div className="flex items-center gap-1">
              {notifications.some(n => !n.read) && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-accent">
                  <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive hover:text-destructive">
                  <X className="w-3.5 h-3.5 mr-1" /> Clear All
                </Button>
              )}
            </div>
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
                  n.read && !acceptedIds.has(n.id) ? "bg-card" : "bg-accent/10 border border-accent/20"
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
                  {renderFollowRequestActions(n)}
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
