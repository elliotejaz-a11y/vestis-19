import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Users, Check, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export function NotificationsSheet({ open, onOpenChange }: Props) {
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();
  const { user } = useAuth();
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const loadRequests = async () => {
      setLoadingRequests(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", user.id)
        .single();
      
      const isPrivate = profile ? !profile.is_public : false;
      setIsPrivateAccount(isPrivate);

      if (isPrivate) {
        const { data: requests } = await supabase
          .from("follow_requests")
          .select("id, requester_id, created_at")
          .eq("target_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (requests && requests.length > 0) {
          const requesterIds = requests.map(r => r.requester_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", requesterIds);

          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          setFollowRequests(requests.map(r => ({
            ...r,
            profile: profileMap.get(r.requester_id) || undefined,
          })));
        } else {
          setFollowRequests([]);
        }
      }
      setLoadingRequests(false);
    };
    loadRequests();
  }, [open, user]);

  const handleAccept = async (request: FollowRequest) => {
    if (!user) return;
    await supabase
      .from("follow_requests")
      .update({ status: "accepted" })
      .eq("id", request.id);
    await supabase
      .from("follows")
      .insert({ follower_id: request.requester_id, following_id: user.id });
    await supabase.rpc("notify_follow_accepted", { accepter_id: user.id, requester_id: request.requester_id });
    setFollowRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const handleDecline = async (request: FollowRequest) => {
    await supabase
      .from("follow_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);
    setFollowRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
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

        {/* Follow Requests Section */}
        {isPrivateAccount && followRequests.length > 0 && (
          <div className="mt-4 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Follow Requests</p>
            <div className="space-y-2">
              {followRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-2xl bg-accent/10 border border-accent/20">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {req.profile?.avatar_url ? (
                      <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {req.profile?.display_name || req.profile?.username || "Unknown"}
                    </p>
                    {req.profile?.username && (
                      <p className="text-[10px] text-muted-foreground">@{req.profile.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" className="h-7 px-3 text-xs rounded-lg" onClick={() => handleAccept(req)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs rounded-lg" onClick={() => handleDecline(req)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : notifications.length === 0 && followRequests.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
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
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
