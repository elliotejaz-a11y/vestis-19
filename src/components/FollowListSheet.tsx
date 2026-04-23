import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocial } from "@/hooks/useSocial";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar";

interface FollowListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
}

interface FollowUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_preset: string | null;
  avatar_position: string;
}

export default function FollowListSheet({ open, onOpenChange, userId, type }: FollowListSheetProps) {
  const { user } = useAuth();
  const { followingIds, followUser, unfollowUser } = useSocial();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const column = type === "followers" ? "follower_id" : "following_id";
      const matchColumn = type === "followers" ? "following_id" : "follower_id";

      const { data: followData } = await supabase
        .from("follows")
        .select(column)
        .eq(matchColumn, userId);

      if (followData && followData.length > 0) {
        const ids = followData.map((f: any) => f[column]);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, avatar_preset, avatar_position")
          .in("id", ids);
        setUsers((profiles || []) as FollowUser[]);
      } else {
        setUsers([]);
      }
      setLoading(false);
    };
    load();
  }, [open, userId, type]);

  const handleToggleFollow = async (targetId: string) => {
    setActionLoading(targetId);
    if (followingIds.includes(targetId)) {
      await unfollowUser(targetId);
    } else {
      await followUser(targetId);
    }
    setActionLoading(null);
  };

  const handleNavigate = (id: string) => {
    onOpenChange(false);
    if (id === user?.id) {
      navigate("/profile");
    } else {
      navigate(`/user/${id}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto pb-24">
        <SheetHeader>
          <SheetTitle className="text-base">{type === "followers" ? "Followers" : "Following"}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-10">
            {type === "followers" ? "No followers yet" : "Not following anyone"}
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl">
                <button onClick={() => handleNavigate(u.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <UserAvatar
                    avatarUrl={u.avatar_url}
                    avatarPreset={u.avatar_preset}
                    displayName={u.display_name}
                    userId={u.id}
                    avatarPosition={u.avatar_position}
                    className="w-10 h-10 flex-shrink-0 bg-card border border-border"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username || "User"}</p>
                    {u.username && <p className="text-[10px] text-muted-foreground">@{u.username}</p>}
                  </div>
                </button>
                {u.id !== user?.id && (
                  <Button
                    size="sm"
                    variant={followingIds.includes(u.id) ? "outline" : "default"}
                    className="h-8 text-xs rounded-lg flex-shrink-0"
                    disabled={actionLoading === u.id}
                    onClick={() => handleToggleFollow(u.id)}
                  >
                    {actionLoading === u.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : followingIds.includes(u.id) ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
