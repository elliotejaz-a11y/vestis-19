import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, useChatMessages, Conversation } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, MessageCircle, Send, Loader2, AlertTriangle,
  Search, UserPlus, UserCheck, Users, Bell, CheckCheck, Shirt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { ClothingItem } from "@/types/wardrobe";

// ─── Friend Profile type ───
interface FriendProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

// ─── Main Chat Page ───
export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { unreadCount } = useNotifications();

  const initialFriendId = searchParams.get("with");
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; avatar: string | null } | null>(null);

  const { conversations, loading: convsLoading } = useChat();

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
          setSelectedFriend(null);
          navigate("/chat", { replace: true });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Chat</h1>
      </header>

      <Tabs defaultValue="messages" className="px-5">
        <TabsList className="w-full grid grid-cols-3 rounded-xl bg-muted/60 h-10 mb-4">
          <TabsTrigger value="messages" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Messages
          </TabsTrigger>
          <TabsTrigger value="friends" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Friends
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm relative">
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessagesTab
            conversations={conversations}
            loading={convsLoading}
            onSelectFriend={(conv) =>
              setSelectedFriend({ id: conv.friendId, name: conv.friendName, avatar: conv.friendAvatar })
            }
            onNewChat={(friend) =>
              setSelectedFriend({ id: friend.id, name: friend.display_name || friend.username || "User", avatar: friend.avatar_url })
            }
          />
        </TabsContent>

        <TabsContent value="friends">
          <FriendsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
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
}: {
  conversations: Conversation[];
  loading: boolean;
  onSelectFriend: (conv: Conversation) => void;
  onNewChat: (friend: FriendProfile) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewChat, setShowNewChat] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const { data: followers } = await supabase.from("follows").select("follower_id").eq("following_id", user.id);
    const myFollowing = (following || []).map((f: any) => f.following_id);
    const myFollowers = (followers || []).map((f: any) => f.follower_id);
    const mutualIds = myFollowing.filter((id: string) => myFollowers.includes(id));
    if (mutualIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, avatar_url, is_public").in("id", mutualIds);
      setFriends((profiles || []) as FriendProfile[]);
    } else {
      setFriends([]);
    }
    setLoadingFriends(false);
  }, [user]);

  useEffect(() => {
    if (showNewChat) fetchFriends();
  }, [showNewChat, fetchFriends]);

  if (showNewChat) {
    // Filter friends not already in conversations
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
                <Avatar url={f.avatar_url} name={f.display_name || f.username || "U"} />
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
              <Avatar url={conv.friendAvatar} name={conv.friendName} size="w-11 h-11" />
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
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2">
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
function FriendsTab() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Wardrobe view state
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendWardrobe, setFriendWardrobe] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const { data: followers } = await supabase.from("follows").select("follower_id").eq("following_id", user.id);
    const myFollowing = (following || []).map((f: any) => f.following_id);
    const myFollowers = (followers || []).map((f: any) => f.follower_id);
    setFollowingIds(myFollowing);
    setFollowerIds(myFollowers);
    const mutualIds = myFollowing.filter((id: string) => myFollowers.includes(id));
    if (mutualIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, avatar_url, is_public").in("id", mutualIds);
      setFriends((profiles || []) as FriendProfile[]);
    } else {
      setFriends([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const isMutualFriend = (userId: string) => followingIds.includes(userId) && followerIds.includes(userId);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const q = searchQuery.trim().toLowerCase();
    const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url, is_public").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq("id", user.id).limit(20);
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
    setLoadingWardrobe(true);
    const { data } = await supabase.from("clothing_items").select("*").eq("user_id", friend.id);
    const items: ClothingItem[] = (data || []).map((r: any) => ({
      id: r.id, name: r.name, category: r.category, color: r.color, fabric: r.fabric,
      imageUrl: r.image_url, backImageUrl: r.back_image_url || undefined,
      tags: r.tags || [], notes: r.notes || "", addedAt: new Date(r.created_at),
      estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
      isPrivate: r.is_private || false,
    }));
    setFriendWardrobe(items);
    setLoadingWardrobe(false);
  };

  // Wardrobe view
  if (selectedFriend) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedFriend(null)} className="-ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3 mb-4">
          <Avatar url={selectedFriend.avatar_url} name={selectedFriend.display_name || selectedFriend.username || "U"} size="w-10 h-10" />
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
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-card border border-border/40 relative">
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

  // Search mode
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
                <Avatar url={p.avatar_url} name={p.display_name || p.username || "U"} />
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

  // Friends list
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
            <button key={friend.id} onClick={() => viewFriendWardrobe(friend)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors">
              <Avatar url={friend.avatar_url} name={friend.display_name || friend.username || "U"} />
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

// ─── Notifications Tab ───
function NotificationsTab() {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, loading, refresh } = useNotifications();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    setFollowingIds((data || []).map((f: any) => f.following_id));
  }, [user]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  const handleFollowBack = async (targetId: string) => {
    if (!user) return;
    setFollowingLoading(targetId);
    await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    setFollowingIds(prev => [...prev, targetId]);
    setFollowingLoading(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div>
      {notifications.some(n => !n.read) && (
        <div className="flex justify-end mb-3">
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-accent">
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
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
            const alreadyFollowing = n.from_user_id ? followingIds.includes(n.from_user_id) : false;

            return (
              <div
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
                  {isFollowerNotif && !alreadyFollowing && (
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
                  {isFollowerNotif && alreadyFollowing && (
                    <p className="text-[10px] text-accent font-medium mt-1">Friends ✓</p>
                  )}
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />}
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
  const { messages, loading, sending, sendMessage } = useChatMessages(friendId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    <div className="min-h-screen flex flex-col pb-16">
      <header className="px-3 pt-12 pb-3 border-b border-border/40 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar url={friendAvatar} name={friendName} size="w-9 h-9" />
        <p className="text-sm font-semibold text-foreground">{friendName}</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16"><p className="text-xs text-muted-foreground">Say hello to {friendName} 👋</p></div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", msg.sender_id === user?.id ? "bg-accent text-accent-foreground" : "bg-card border border-border/40 text-foreground")}>
                {msg.is_flagged ? (
                  <span className="flex items-center gap-1 text-muted-foreground italic text-xs"><AlertTriangle className="w-3 h-3" /> Message removed</span>
                ) : msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-border/40 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Type a message..." className="rounded-xl bg-card text-sm" maxLength={2000} disabled={sending} />
        <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" className="rounded-xl bg-accent text-accent-foreground shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Shared Avatar Component ───
function Avatar({ url, name, size = "w-11 h-11" }: { url: string | null; name: string; size?: string }) {
  return (
    <div className={cn(size, "rounded-full overflow-hidden bg-muted border border-border flex-shrink-0")}>
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
