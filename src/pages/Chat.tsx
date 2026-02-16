import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, useChatMessages, Conversation } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Send, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const initialFriendId = searchParams.get("with");
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; avatar: string | null } | null>(null);

  const { conversations, loading: convsLoading } = useChat();

  // Load friend profile if coming from URL param
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
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Messages</h1>
        <p className="text-xs text-muted-foreground mt-1">Chat with your friends</p>
      </header>

      {convsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 px-5">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start a chat from your friends list</p>
          <Button onClick={() => navigate("/friends")} className="mt-4 rounded-xl bg-accent text-accent-foreground">
            Go to Friends
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.friendId}
              onClick={() =>
                setSelectedFriend({
                  id: conv.friendId,
                  name: conv.friendName,
                  avatar: conv.friendAvatar,
                })
              }
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                {conv.friendAvatar ? (
                  <img src={conv.friendAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
                    {conv.friendName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
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
      toast({
        title: "Message not sent",
        description: error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <header className="px-3 pt-12 pb-3 border-b border-border/40 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
          {friendAvatar ? (
            <img src={friendAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
              {friendName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground">{friendName}</p>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xs text-muted-foreground">Say hello to {friendName} 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                  msg.sender_id === user?.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border/40 text-foreground"
                )}
              >
                {msg.is_flagged ? (
                  <span className="flex items-center gap-1 text-muted-foreground italic text-xs">
                    <AlertTriangle className="w-3 h-3" /> Message removed
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/40 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="rounded-xl bg-card text-sm"
          maxLength={2000}
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="icon"
          className="rounded-xl bg-accent text-accent-foreground shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
