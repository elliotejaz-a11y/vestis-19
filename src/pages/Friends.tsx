import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, UserCheck, Users, ArrowLeft, Shirt, Lock, Loader2, X, Bell, MessageCircle } from "lucide-react";
import { ClothingItem } from "@/types/wardrobe";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { useState as useStateImport } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsSheet } from "@/components/NotificationsSheet";

interface FriendProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

type View = "list" | "search" | "wardrobe";

export default function Friends() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("list");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendWardrobe, setFriendWardrobe] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  // Fetch mutual friends
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get people I follow
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const myFollowing = (following || []).map((f: any) => f.following_id);
    setFollowingIds(myFollowing);

    // Get people who follow me
    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id);
    const myFollowers = (followers || []).map((f: any) => f.follower_id);
    setFollowerIds(myFollowers);

    // Mutual = intersection
    const mutualIds = myFollowing.filter((id: string) => myFollowers.includes(id));

    if (mutualIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, is_public")
        .in("id", mutualIds);
      setFriends((profiles || []) as FriendProfile[]);
    } else {
      setFriends([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const isMutualFriend = (userId: string) =>
    followingIds.includes(userId) && followerIds.includes(userId);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3 || !user) return;
    setSearching(true);
    const q = searchQuery.trim().toLowerCase();

    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_public")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(10);

    setSearchResults((data || []) as FriendProfile[]);
    setSearching(false);
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    if (followingIds.includes(targetId)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
    await fetchFriends();
  };

  const viewFriendWardrobe = async (friend: FriendProfile) => {
    setSelectedFriend(friend);
    setView("wardrobe");
    setLoadingWardrobe(true);

    const { data } = await supabase
      .from("clothing_items")
      .select("id, name, category, color, fabric, image_url, back_image_url, tags, notes, created_at, estimated_price, is_private")
      .eq("user_id", friend.id);

    const items: ClothingItem[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      color: r.color,
      fabric: r.fabric,
      imageUrl: r.image_url,
      backImageUrl: r.back_image_url || undefined,
      tags: r.tags || [],
      notes: r.notes || "",
      addedAt: new Date(r.created_at),
      estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
      isPrivate: r.is_private || false,
    }));

    setFriendWardrobe(items);
    setLoadingWardrobe(false);
  };

  const renderAvatar = (profile: FriendProfile, size = "w-12 h-12") => (
    <div className={cn(size, "rounded-full overflow-hidden bg-card border border-border flex-shrink-0")}>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Users className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  // Friend's wardrobe view
  if (view === "wardrobe" && selectedFriend) {
    return (
      <div className="min-h-screen pb-24">
        <header className="px-5 pt-12 pb-4">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedFriend(null); }} className="-ml-2 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3">
            {renderAvatar(selectedFriend, "w-10 h-10")}
            <div>
              <h1 className="text-lg font-bold text-foreground">{selectedFriend.display_name || selectedFriend.username || "User"}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shirt className="w-3 h-3" /> {friendWardrobe.length} items
              </p>
            </div>
          </div>
        </header>

        {loadingWardrobe ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : friendWardrobe.length === 0 ? (
          <div className="text-center py-16 px-5">
            <Shirt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items to show</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 px-1">
            {friendWardrobe.map((item) => (
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-card border border-border/40 relative group">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                  <p className="text-[9px] text-white/70">{item.category} • {item.color}</p>
                  {item.estimatedPrice !== undefined && (
                    <p className="text-[9px] text-white/80 font-semibold">{formatPrice(item.estimatedPrice, profile?.currency_preference || "NZD")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Search view
  if (view === "search") {
    return (
      <div className="min-h-screen pb-24">
        <header className="px-5 pt-12 pb-4">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSearchQuery(""); setSearchResults([]); }} className="-ml-2 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold text-foreground">Find Friends</h1>
        </header>

        <div className="px-5 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 rounded-xl bg-card"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} className="rounded-xl bg-accent text-accent-foreground">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        <div className="px-5 space-y-2">
          {searchResults.map((p) => {
            const isFollowing = followingIds.includes(p.id);
            const isFriend = isMutualFriend(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40">
                {renderAvatar(p)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.display_name || p.username || "User"}</p>
                  {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                  {isFriend && <p className="text-[10px] text-accent font-medium">Friends ✓</p>}
                </div>
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => handleFollow(p.id)}
                  className="rounded-xl text-xs h-8"
                >
                  {isFriend ? (
                    <><UserCheck className="w-3.5 h-3.5 mr-1" /> Friends</>
                  ) : isFollowing ? (
                    "Requested"
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5 mr-1" /> Add</>
                  )}
                </Button>
              </div>
            );
          })}
          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
          )}
        </div>
      </div>
    );
  }

  // Friends list (default)
  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Friends</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowNotifications(true)} className="relative h-9 w-9">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView("search")} className="rounded-xl">
              <UserPlus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {friends.length} mutual {friends.length === 1 ? "friend" : "friends"}
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-16 px-5">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No friends yet</p>
          <p className="text-xs text-muted-foreground mt-1">Search and add friends to see their wardrobe</p>
          <Button onClick={() => setView("search")} className="mt-4 rounded-xl bg-accent text-accent-foreground">
            <Search className="w-4 h-4 mr-1" /> Find Friends
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-2 mt-2">
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => viewFriendWardrobe(friend)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors"
            >
              {renderAvatar(friend)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{friend.display_name || friend.username || "User"}</p>
                {friend.username && <p className="text-xs text-muted-foreground">@{friend.username}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat?with=${friend.id}`);
                  }}
                >
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Shirt className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
      <NotificationsSheet open={showNotifications} onOpenChange={setShowNotifications} />
    </div>
  );
}
