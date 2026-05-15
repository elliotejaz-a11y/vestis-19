import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, useChatMessages, Conversation } from "@/hooks/useChat";
import { useFollowData } from "@/hooks/useFollowData";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, MessageCircle, Send, Loader2, AlertTriangle,
  Search, UserPlus, UserCheck, Users, Bell, Check, CheckCheck, Shirt, Compass, Sparkles, Image, MoreVertical, Flag, X
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { ClothingItem } from "@/types/wardrobe";
import { resolveSignedClothingImageFields, isStoragePath } from "@/lib/storage";
import { ReportSheet } from "@/components/ReportSheet";
import { SignedSocialImage } from "@/components/SignedSocialImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClothingDetailSheet } from "@/components/ClothingDetailSheet";

// ─── Bold text helper ───
function renderBoldText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

// ─── Friend Profile type ───
interface FriendProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_preset: string | null;
  is_public: boolean;
  style_preference?: string | null;
  bio?: string | null;
}

// ─── Main Chat Page ───
export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { notifications, unreadCount, markAllAsRead, markAsRead, loading: notifLoading, refresh: refreshNotifications, clearAll: clearAllNotifications } = useNotifications();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const state = location.state as { tab?: string } | null;
    return state?.tab || "messages";
  });

  const initialFriendId = searchParams.get("with");
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; avatar: string | null } | null>(null);

  const { conversations, loading: convsLoading, refetch: refetchConversations, clearUnread } = useChat();
  const { followingIds, followerIds, loading: followDataLoading, refresh: refreshFollowData } = useFollowData();

  // Auto-mark all notifications as read when notifications tab is opened
  useEffect(() => {
    if (activeTab === "notifications" && unreadCount > 0) {
      markAllAsRead();
    }
  }, [activeTab, unreadCount, markAllAsRead]);

  useEffect(() => {
    if (initialFriendId && !selectedFriend) {
      supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", initialFriendId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedFriend({
              id: data.id,
              name: data.display_name || data.username || "User",
              avatar: data.avatar_url,
            });
          }
        });
    }
  }, [initialFriendId]);

  if (selectedFriend) {
    return (
      <ChatView
        friendId={selectedFriend.id}
        friendName={selectedFriend.name}
        friendAvatar={selectedFriend.avatar}
        onBack={() => {
          refetchConversations();
          setSelectedFriend(null);
          navigate("/chat", { replace: true });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Socials</h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-5">
        <TabsList className="w-full grid grid-cols-4 rounded-xl bg-muted/60 h-10 mb-4">
          <TabsTrigger value="messages" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Messages
          </TabsTrigger>
          <TabsTrigger value="friends" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Friends
          </TabsTrigger>
          <TabsTrigger value="discover" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Discover
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm relative">
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessagesTab
            conversations={conversations}
            loading={convsLoading}
            onSelectFriend={(conv) => {
              clearUnread(conv.friendId);
              setSelectedFriend({ id: conv.friendId, name: conv.friendName, avatar: conv.friendAvatar });
            }}
            onNewChat={(friend) =>
              setSelectedFriend({ id: friend.id, name: friend.display_name || friend.username || "User", avatar: friend.avatar_url })
            }
            followingIds={followingIds}
            followerIds={followerIds}
          />
        </TabsContent>

        <TabsContent value="friends">
          <FriendsTab
            followingIds={followingIds}
            followerIds={followerIds}
            followDataLoading={followDataLoading}
            refreshFollowData={refreshFollowData}
          />
        </TabsContent>

        <TabsContent value="discover">
          <DiscoverTab
            followingIds={followingIds}
            followerIds={followerIds}
            refreshFollowData={refreshFollowData}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab
            notifications={notifications}
            notifLoading={notifLoading}
            markAsRead={markAsRead}
            refresh={refreshNotifications}
            clearAll={clearAllNotifications}
            followingIds={followingIds}
            followerIds={followerIds}
            refreshFollowData={refreshFollowData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Messages Tab ───
function MessagesTab({
  conversations,
  loading,
  onSelectFriend,
  onNewChat,
  followingIds,
  followerIds,
}: {
  conversations: Conversation[];
  loading: boolean;
  onSelectFriend: (conv: Conversation) => void;
  onNewChat: (friend: FriendProfile) => void;
  followingIds: string[];
  followerIds: string[];
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewChat, setShowNewChat] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const mutualIds = followingIds.filter(id => followerIds.includes(id));
    if (mutualIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_preset, is_public").in("id", mutualIds);
      setFriends((profiles || []) as FriendProfile[]);
    } else {
      setFriends([]);
    }
    setLoadingFriends(false);
  }, [user, followingIds, followerIds]);

  useEffect(() => {
    if (showNewChat) fetchFriends();
  }, [showNewChat, fetchFriends]);

  if (showNewChat) {
    const existingIds = new Set(conversations.map(c => c.friendId));
    const newFriends = friends.filter(f => !existingIds.has(f.id));

    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowNewChat(false)} className="-ml-2 mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-sm font-semibold text-foreground mb-3">Start a new chat</p>
        {loadingFriends ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
        ) : newFriends.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">All your friends already have conversations</p>
        ) : (
          <div className="space-y-1">
            {newFriends.map(f => (
              <button key={f.id} onClick={() => onNewChat(f)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors">
                <UserAvatar avatarUrl={f.avatar_url} avatarPreset={f.avatar_preset} displayName={f.display_name} userId={f.id} className="w-11 h-11 flex-shrink-0 bg-muted border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{f.display_name || f.username || "User"}</p>
                  {f.username && <p className="text-xs text-muted-foreground">@{f.username}</p>}
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={() => setShowNewChat(true)} className="rounded-xl text-xs">
          <MessageCircle className="w-3.5 h-3.5 mr-1" /> New Chat
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start a chat with one of your friends</p>
          <Button onClick={() => setShowNewChat(true)} className="mt-4 rounded-xl bg-accent text-accent-foreground">
            New Chat
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.friendId}
              onClick={() => onSelectFriend(conv)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors"
            >
              <UserAvatar avatarUrl={conv.friendAvatar} displayName={conv.friendName} userId={conv.friendId} className="w-11 h-11 flex-shrink-0 bg-muted border border-border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm font-semibold text-foreground truncate", conv.unreadCount > 0 && "font-bold")}>
                    {conv.friendName}
                  </p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn("text-xs truncate", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {conv.lastMessage.startsWith("[IMG]") ? "📷 Photo" : conv.lastMessage}
                  </p>
                    {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Friends Tab ───
function FriendsTab({
  followingIds,
  followerIds,
  followDataLoading,
  refreshFollowData,
}: {
  followingIds: string[];
  followerIds: string[];
  followDataLoading: boolean;
  refreshFollowData: () => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendWardrobe, setFriendWardrobe] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [selectedFriendItem, setSelectedFriendItem] = useState<ClothingItem | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!user || followDataLoading) return;
    setLoading(true);
    const mutualIds = followingIds.filter(id => followerIds.includes(id));
    if (mutualIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_preset, is_public").in("id", mutualIds);
      setFriends((profiles || []) as FriendProfile[]);
    } else {
      setFriends([]);
    }
    setLoading(false);
  }, [user, followingIds, followerIds, followDataLoading]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const isMutualFriend = (userId: string) => followingIds.includes(userId) && followerIds.includes(userId);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3 || !user) return;
    setSearching(true);
    const q = searchQuery.trim().toLowerCase();
    const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url, avatar_preset, is_public").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq("id", user.id).limit(10);
    setSearchResults((data || []) as FriendProfile[]);
    setSearching(false);
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    try {
      if (followingIds.includes(targetId)) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
      }
      await refreshFollowData();
    } catch {
      toast({ title: "Could not update follow status", description: "Please try again.", variant: "destructive" });
    }
  };

  const viewFriendWardrobe = async (friend: FriendProfile) => {
    setSelectedFriend(friend);
    setLoadingWardrobe(true);
    const { data } = await supabase.from("clothing_items").select("*").eq("user_id", friend.id).eq("is_private", false);
    const items = await Promise.all((data || []).map((r: any) => resolveSignedClothingImageFields({
      id: r.id, name: r.name, category: r.category, color: r.color, fabric: r.fabric,
      imageUrl: isStoragePath(r.image_url) ? "" : r.image_url, imagePath: isStoragePath(r.image_url) ? r.image_url : undefined,
      backImageUrl: r.back_image_url && !isStoragePath(r.back_image_url) ? r.back_image_url : undefined, backImagePath: isStoragePath(r.back_image_url) ? r.back_image_url : undefined,
      tags: r.tags || [], notes: r.notes || "", addedAt: new Date(r.created_at),
      estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
      isPrivate: r.is_private || false,
    })));
    setFriendWardrobe(items);
    setLoadingWardrobe(false);
  };

  if (selectedFriend) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedFriend(null)} className="-ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar avatarUrl={selectedFriend.avatar_url} avatarPreset={selectedFriend.avatar_preset} displayName={selectedFriend.display_name} userId={selectedFriend.id} className="w-10 h-10 flex-shrink-0 bg-muted border border-border" />
          <div>
            <p className="text-sm font-bold text-foreground">{selectedFriend.display_name || selectedFriend.username || "User"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Shirt className="w-3 h-3" /> {friendWardrobe.length} items</p>
          </div>
        </div>
        {loadingWardrobe ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
        ) : friendWardrobe.length === 0 ? (
          <div className="text-center py-12"><Shirt className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No items to show</p></div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {friendWardrobe.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedFriendItem(item)}
                className="aspect-square rounded-xl overflow-hidden bg-card border border-border/40 relative active:scale-95 transition-transform"
              >
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                  <p className="text-[9px] text-white/70">{item.category} • {item.color}</p>
                  {item.estimatedPrice !== undefined && (
                    <p className="text-[9px] text-white/80 font-semibold">{formatPrice(item.estimatedPrice, profile?.currency_preference || "NZD")}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <ClothingDetailSheet
          item={selectedFriendItem}
          open={!!selectedFriendItem}
          onOpenChange={(o) => { if (!o) setSelectedFriendItem(null); }}
          readOnly
        />
      </div>
    );
  }

  if (searchMode) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => { setSearchMode(false); setSearchQuery(""); setSearchResults([]); }} className="-ml-2 mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-9 rounded-xl bg-card" />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="rounded-xl bg-accent text-accent-foreground">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        <div className="space-y-2">
          {searchResults.map((p) => {
            const isFollowing = followingIds.includes(p.id);
            const isFriend = isMutualFriend(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40">
                <UserAvatar avatarUrl={p.avatar_url} avatarPreset={p.avatar_preset} displayName={p.display_name} userId={p.id} className="w-11 h-11 flex-shrink-0 bg-muted border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.display_name || p.username || "User"}</p>
                  {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                  {isFriend && <p className="text-[10px] text-accent font-medium">Friends ✓</p>}
                </div>
                <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={() => handleFollow(p.id)} className="rounded-xl text-xs h-8">
                  {isFriend ? <><UserCheck className="w-3.5 h-3.5 mr-1" /> Friends</> : isFollowing ? "Requested" : <><UserPlus className="w-3.5 h-3.5 mr-1" /> Add</>}
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{friends.length} mutual {friends.length === 1 ? "friend" : "friends"}</p>
        <Button variant="outline" size="sm" onClick={() => setSearchMode(true)} className="rounded-xl text-xs">
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : friends.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No friends yet</p>
          <p className="text-xs text-muted-foreground mt-1">Search and add friends to see their wardrobe</p>
          <Button onClick={() => setSearchMode(true)} className="mt-4 rounded-xl bg-accent text-accent-foreground">
            <Search className="w-4 h-4 mr-1" /> Find Friends
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {friends.map((friend) => (
            <button key={friend.id} onClick={() => navigate(`/user/${friend.id}`, { state: { from: "friends" } })} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors">
              <UserAvatar avatarUrl={friend.avatar_url} avatarPreset={friend.avatar_preset} displayName={friend.display_name} userId={friend.id} className="w-11 h-11 flex-shrink-0 bg-muted border border-border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{friend.display_name || friend.username || "User"}</p>
                {friend.username && <p className="text-xs text-muted-foreground">@{friend.username}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/chat?with=${friend.id}`); }}>
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Shirt className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DISCOVER_PAGE_SIZE = 50;

// ─── Discover Tab ───
function DiscoverTab({
  followingIds,
  followerIds,
  refreshFollowData,
}: {
  followingIds: string[];
  followerIds: string[];
  refreshFollowData: () => Promise<void>;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [people, setPeople] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);

  const fetchDiscover = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch ALL profiles (public and private) + blocked users in parallel.
    // Private-profile users still appear in discover — their content stays protected.
    const [{ data: profiles }, { data: blockedByMe }, { data: blockedMe }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_preset, is_public, style_preference, bio")
        .neq("id", user.id)
        .not("username", "is", null)
        .neq("username", "")
        .not("avatar_url", "is", null)
        .neq("avatar_url", "")
        .order("created_at", { ascending: false })
        .range(0, DISCOVER_PAGE_SIZE - 1),
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", user.id),
    ]);

    const blocked = new Set([
      ...(blockedByMe || []).map((r: any) => r.blocked_id),
      ...(blockedMe || []).map((r: any) => r.blocker_id),
    ]);
    setBlockedIds(blocked);

    const visible = (profiles || [])
      .filter((p: any) => !blocked.has(p.id) && p.username && p.username.trim() !== "" && typeof p.avatar_url === "string" && p.avatar_url.length > 0);
    setPeople(visible as FriendProfile[]);
    setHasMore((profiles || []).length === DISCOVER_PAGE_SIZE);
    setPage(0);
    setLoading(false);
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, avatar_preset, is_public, style_preference, bio")
      .neq("id", user.id)
      .not("username", "is", null)
      .neq("username", "")
      .not("avatar_url", "is", null)
      .neq("avatar_url", "")
      .order("created_at", { ascending: false })
      .range(nextPage * DISCOVER_PAGE_SIZE, (nextPage + 1) * DISCOVER_PAGE_SIZE - 1);

    const visible = (profiles || []).filter((p: any) => !blockedIds.has(p.id) && p.username && p.username.trim() !== "" && typeof p.avatar_url === "string" && p.avatar_url.length > 0);
    setPeople((prev) => [...prev, ...visible as FriendProfile[]]);
    setHasMore((profiles || []).length === DISCOVER_PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  }, [user, page, loadingMore, blockedIds]);

  useEffect(() => { fetchDiscover(); }, [fetchDiscover]);

  const isMutualFriend = (userId: string) => followingIds.includes(userId) && followerIds.includes(userId);

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    setFollowingLoading(targetId);
    try {
      if (followingIds.includes(targetId)) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
      }
      await refreshFollowData();
    } catch {
      toast({ title: "Could not update follow status", description: "Please try again.", variant: "destructive" });
    } finally {
      setFollowingLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Suggested for you</p>
        </div>
        <p className="text-xs text-muted-foreground">People you might want to connect with</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : people.length === 0 ? (
        <div className="text-center py-12">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No one to discover yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((p) => {
            const isFollowing = followingIds.includes(p.id);
            const isFriend = isMutualFriend(p.id);
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/user/${p.id}`, { state: { from: "discover" } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/user/${p.id}`, { state: { from: "discover" } });
                  }
                }}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/40 bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <UserAvatar avatarUrl={p.avatar_url} avatarPreset={p.avatar_preset} displayName={p.display_name} userId={p.id} className="w-12 h-12 flex-shrink-0 bg-muted border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.display_name || p.username || "User"}</p>
                  {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                  {p.style_preference && (
                    <p className="text-[10px] text-accent/80 mt-0.5 truncate">{p.style_preference} style</p>
                  )}
                  {!p.style_preference && p.bio && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.bio}</p>
                  )}
                  {isFriend && <p className="text-[10px] text-accent font-medium">Friends ✓</p>}
                </div>
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(p.id);
                  }}
                  disabled={followingLoading === p.id}
                  className="rounded-xl text-xs h-8"
                >
                  {followingLoading === p.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFriend ? (
                    <><UserCheck className="w-3.5 h-3.5 mr-1" /> Friends</>
                  ) : isFollowing ? (
                    "Following"
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>
                  )}
                </Button>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-xs font-medium text-accent flex items-center justify-center gap-2"
            >
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───
function NotificationsTab({
  notifications,
  notifLoading: loading,
  markAsRead,
  refresh,
  clearAll,
  followingIds,
  followerIds,
  refreshFollowData,
}: {
  notifications: ReturnType<typeof useNotifications>["notifications"];
  notifLoading: boolean;
  markAsRead: ReturnType<typeof useNotifications>["markAsRead"];
  refresh: ReturnType<typeof useNotifications>["refresh"];
  clearAll: ReturnType<typeof useNotifications>["clearAll"];
  followingIds: string[];
  followerIds: string[];
  refreshFollowData: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState<string[]>([]);
  const [declinedRequestIds, setDeclinedRequestIds] = useState<string[]>([]);
  // Tracks users we've sent a follow-request to (private accounts). refreshFollowData only
  // reads the follows table so it won't reflect pending requests — we track them locally.
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);

  const handleAcceptFollowRequest = async (notificationId: string, requesterId: string) => {
    if (!user) return;
    setRequestActionLoading(notificationId);
    try {
      const { error } = await supabase.rpc("accept_follow_request", {
        request_notification_id: notificationId,
        request_requester_id: requesterId,
      });
      if (error) throw error;
      setAcceptedRequestIds((prev) => [...prev, notificationId]);
      await refresh();
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleDeclineFollowRequest = async (notificationId: string, requesterId: string) => {
    if (!user) return;
    setRequestActionLoading(notificationId);
    try {
      await supabase.from("follow_requests").delete().match({ requester_id: requesterId, target_id: user.id });
      await markAsRead(notificationId);
      setDeclinedRequestIds((prev) => [...prev, notificationId]);
      await refresh();
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleFollowBack = async (targetId: string) => {
    if (!user) return;
    setFollowingLoading(targetId);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", targetId)
        .single();

      if (profileData?.is_public === false) {
        // Private account — send a follow request. Ignore duplicate (23505) silently.
        const { error: reqError } = await supabase
          .from("follow_requests")
          .insert({ requester_id: user.id, target_id: targetId });
        if (reqError && reqError.code !== "23505") throw reqError;
        await supabase.rpc("notify_follow_request", { requester_id: user.id, target_id: targetId });
        // refreshFollowData won't reflect a pending request, so track locally.
        setRequestedUserIds((prev) => [...new Set([...prev, targetId])]);
      } else {
        // Public account — upsert so a double-tap never throws a unique constraint error.
        const { error: followError } = await supabase
          .from("follows")
          .upsert(
            { follower_id: user.id, following_id: targetId },
            { onConflict: "follower_id,following_id", ignoreDuplicates: true }
          );
        if (followError) throw followError;
        await refreshFollowData();
      }
    } catch (err: any) {
      toast({
        title: "Couldn't follow",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFollowingLoading(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower":
      case "follow_request":
        return <UserPlus className="w-4 h-4 text-accent" />;
      case "follow_accepted":
        return <Check className="w-4 h-4 text-accent" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div>
      {!loading && notifications.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive hover:text-destructive">
            <X className="w-3.5 h-3.5 mr-1" /> Clear All
          </Button>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const isFollowerNotif = n.type === "new_follower" && n.from_user_id;
            const isFollowRequestNotif = n.type === "follow_request" && n.from_user_id;
            const alreadyFollowing = n.from_user_id ? followingIds.includes(n.from_user_id) : false;
            const hasRequested = n.from_user_id ? requestedUserIds.includes(n.from_user_id) : false;
            const requestAccepted = acceptedRequestIds.includes(n.id);
            const requestDeclined = declinedRequestIds.includes(n.id);
            // Also treat read follow_request as accepted if requester is already a follower
            const previouslyAccepted = isFollowRequestNotif && n.read && !requestAccepted && !requestDeclined && n.from_user_id ? followerIds.includes(n.from_user_id) : false;
            const showAccepted = requestAccepted || previouslyAccepted;

            return (
              <div
                key={n.id}
                className="w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-colors bg-card"
              >
                {n.from_user_id ? (
                  <UserAvatar
                    avatarUrl={n.from_profile?.avatar_url}
                    displayName={n.from_profile?.display_name}
                    userId={n.from_user_id}
                    className="w-10 h-10 flex-shrink-0 bg-card border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>

                  {isFollowRequestNotif && !showAccepted && !requestDeclined && !n.read && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptFollowRequest(n.id, n.from_user_id!);
                        }}
                        disabled={requestActionLoading === n.id}
                        className="rounded-xl text-xs h-7 bg-accent text-accent-foreground"
                      >
                        {requestActionLoading === n.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeclineFollowRequest(n.id, n.from_user_id!);
                        }}
                        disabled={requestActionLoading === n.id}
                        className="rounded-xl text-xs h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {isFollowRequestNotif && showAccepted && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <p className="text-[10px] text-accent font-medium">Accepted ✓</p>
                      {!alreadyFollowing && !hasRequested && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowBack(n.from_user_id!);
                          }}
                          disabled={followingLoading === n.from_user_id}
                          className="rounded-xl text-xs h-7 bg-accent text-accent-foreground"
                        >
                          {followingLoading === n.from_user_id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <UserPlus className="w-3 h-3 mr-1" />
                          )}
                          Follow Back
                        </Button>
                      )}
                      {!alreadyFollowing && hasRequested && (
                        <p className="text-[10px] text-muted-foreground font-medium">Requested</p>
                      )}
                    </div>
                  )}

                  {isFollowerNotif && !alreadyFollowing && !hasRequested && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowBack(n.from_user_id!);
                      }}
                      disabled={followingLoading === n.from_user_id}
                      className="mt-2 rounded-xl text-xs h-7 bg-accent text-accent-foreground"
                    >
                      {followingLoading === n.from_user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <UserPlus className="w-3 h-3 mr-1" />
                      )}
                      Follow Back
                    </Button>
                  )}
                  {isFollowerNotif && !alreadyFollowing && hasRequested && (
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Requested</p>
                  )}
                  {isFollowerNotif && alreadyFollowing && (
                    <p className="text-[10px] text-accent font-medium mt-1">Friends ✓</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Chat View ───
function ChatView({
  friendId,
  friendName,
  friendAvatar,
  onBack,
}: {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sending, sendMessage } = useChatMessages(friendId);
  const [input, setInput] = useState("");
  const [showFitPics, setShowFitPics] = useState(false);
  const [fitPics, setFitPics] = useState<any[]>([]);
  const [loadingPics, setLoadingPics] = useState(false);
  const [reportMsg, setReportMsg] = useState<{ id: string; senderId: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialScrollDone = useRef(false);
  const { toast } = useToast();

  const loadFitPics = async () => {
    if (!user) return;
    setLoadingPics(true);
    const { data } = await supabase
      .from("fit_pics")
      .select("id, image_url, description, pic_date")
      .eq("user_id", user.id)
      .order("pic_date", { ascending: false });
    setFitPics(data || []);
    setLoadingPics(false);
  };

  const sendFitPic = async (imageUrl: string) => {
    const { error } = await sendMessage(`[IMG]${imageUrl}[/IMG]`);
    if (error) {
      toast({ title: "Failed to send", description: error, variant: "destructive" });
    }
    setShowFitPics(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    setUploadingImage(true);
    try {
      const path = `${user.id}/chat-images/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("social-content")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (uploadErr) throw uploadErr;
      const { error } = await sendMessage(`[IMG]${path}[/IMG]`);
      if (error) {
        toast({ title: "Failed to send image", description: error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Could not upload image", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: initialScrollDone.current ? "smooth" : "instant" });
      initialScrollDone.current = true;
    });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    const { error } = await sendMessage(text);
    if (error) {
      toast({ title: "Message not sent", description: error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-3 pt-12 pb-3 border-b border-border/40 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <button onClick={() => navigate(`/user/${friendId}`)} className="flex items-center gap-3">
          <UserAvatar avatarUrl={friendAvatar} displayName={friendName} userId={friendId} className="w-9 h-9 bg-muted border border-border" />
          <p className="text-sm font-semibold text-foreground">{friendName}</p>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16"><p className="text-xs text-muted-foreground">Say hello to {friendName} 👋</p></div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const isTemp = msg.id.startsWith("temp-");
            const isImage = msg.content.startsWith("[IMG]") && msg.content.endsWith("[/IMG]");
            const imageUrl = isImage ? msg.content.slice(5, -6) : null;
            return (
              <div key={msg.id} className={cn("flex group", isMine ? "justify-end" : "justify-start")}>
                <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMine ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1">
                    {!isMine && !msg.is_flagged && (
                      <button
                        onClick={() => setReportMsg({ id: msg.id, senderId: msg.sender_id })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Flag className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                    <div className={cn("rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap", isMine ? "bg-accent text-accent-foreground" : "bg-card border border-border/40 text-foreground")}>
                      {isImage && imageUrl ? (
                        <SignedSocialImage src={imageUrl} alt="Fit pic" className="rounded-xl max-w-[200px] max-h-[200px] object-cover" />
                      ) : renderBoldText(msg.content)}
                    </div>
                  </div>
                  {isMine && (
                    <div className="flex items-center gap-0.5 mr-1">
                      {isTemp ? (
                        <Check className="w-3 h-3 text-muted-foreground/50" />
                      ) : msg.read ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : (
                        <CheckCheck className="w-3 h-3 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showFitPics && (
        <div className="px-4 py-2 border-t border-border/40 bg-card max-h-[200px] overflow-y-auto">
          <p className="text-xs font-medium text-foreground mb-2">Send a Fit Pic</p>
          {loadingPics ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>
          ) : fitPics.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No fit pics yet</p>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {fitPics.map((pic: any) => (
                <button key={pic.id} onClick={() => sendFitPic(pic.image_url)} className="aspect-square rounded-lg overflow-hidden">
                  <SignedSocialImage src={pic.image_url} alt={pic.description || ""} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 border-t border-border/40 flex gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0 h-10 w-10" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Image className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Type a message..." className="rounded-xl bg-card text-sm" maxLength={2000} disabled={sending} />
        <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" className="rounded-xl bg-accent text-accent-foreground shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {reportMsg && (
        <ReportSheet
          open={!!reportMsg}
          onOpenChange={(o) => { if (!o) setReportMsg(null); }}
          reportedUserId={reportMsg.senderId}
          reportType="message"
          referenceId={reportMsg.id}
        />
      )}
    </div>
  );
}

