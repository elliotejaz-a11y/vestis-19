import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  is_flagged: boolean;
}

export interface Conversation {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  friendUsername: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all messages involving this user
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, { lastMsg: any; unread: number }>();
    for (const msg of messages) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          lastMsg: msg,
          unread: !msg.read && msg.receiver_id === user.id ? 1 : 0,
        });
      } else {
        const existing = convMap.get(partnerId)!;
        if (!msg.read && msg.receiver_id === user.id) {
          existing.unread++;
        }
      }
    }

    // Fetch profiles for all partners
    const partnerIds = Array.from(convMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", partnerIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const convs: Conversation[] = partnerIds.map((pid) => {
      const { lastMsg, unread } = convMap.get(pid)!;
      const profile = profileMap.get(pid);
      return {
        friendId: pid,
        friendName: profile?.display_name || profile?.username || "User",
        friendAvatar: profile?.avatar_url || null,
        friendUsername: profile?.username || null,
        lastMessage: lastMsg.content,
        lastMessageAt: lastMsg.created_at,
        unreadCount: unread,
      };
    });

    convs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(convs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Keep a stable ref so the realtime callback can call fetchConversations
  // without it becoming a subscription dependency (which would re-subscribe on every render)
  const fetchConversationsRef = useRef(fetchConversations);
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  // Realtime subscription — updates conversations in-place instead of re-fetching everything
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (!msg?.sender_id || !msg?.receiver_id) return;

          const friendId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

          // Track whether the conversation already exists so we can fall back outside setState
          let isKnown = false;

          setConversations((prev) => {
            const convIndex = prev.findIndex((c) => c.friendId === friendId);
            if (convIndex === -1) {
              isKnown = false;
              return prev; // unchanged — full refetch triggered below
            }
            isKnown = true;
            const updated = prev.map((c) => {
              if (c.friendId !== friendId) return c;
              return {
                ...c,
                lastMessage: msg.content,
                lastMessageAt: msg.created_at,
                unreadCount:
                  msg.receiver_id === user.id && !msg.read
                    ? c.unreadCount + 1
                    : c.unreadCount,
              };
            });
            return updated.sort(
              (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
          });

          // Only do a full refetch when the message is from a brand-new conversation partner
          if (!isKnown) {
            fetchConversationsRef.current();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]); // no longer depends on fetchConversations

  const clearUnread = useCallback((friendId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.friendId === friendId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  return { conversations, loading, refetch: fetchConversations, clearUnread };
}

export function useChatMessages(friendId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) return;
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    setMessages((data || []) as ChatMessage[]);
    setLoading(false);

    // Mark unread messages as read
    if (data && data.length > 0) {
      const unreadIds = data
        .filter((m: any) => !m.read && m.receiver_id === user.id)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        setMessages((prev) =>
          prev.map((message) =>
            unreadIds.includes(message.id) ? { ...message, read: true } : message
          )
        );

        await supabase.rpc("mark_messages_read", {
          friend_user_id: friendId,
        });
      }
    }
  }, [user, friendId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Stable ref for the active channel — lets us synchronously tear down the old
  // subscription before creating a new one when friendId changes
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Realtime
  useEffect(() => {
    if (!user || !friendId) return;

    // Synchronously remove any existing channel before subscribing to the new one.
    // This prevents orphaned channels when the user switches conversations quickly.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`chat-${friendId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === user.id && msg.receiver_id === friendId) ||
            (msg.sender_id === friendId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              const filtered = prev.filter((m) => !m.id.startsWith("temp-") || m.sender_id !== msg.sender_id);
              return [...filtered, msg];
            });
            if (msg.receiver_id === user.id && !msg.read) {
              setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: true } : m));
              supabase.rpc("mark_messages_read", { friend_user_id: friendId }).then(() => {});
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, read: updated.read } : m));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, friendId]);

  const sendMessage = async (content: string) => {
    if (!user || !friendId || !content.trim()) return { error: null };
    setSending(true);

    // Optimistic update: show message immediately
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: friendId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      read: false,
      is_flagged: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          content: content.trim(),
        })
        .select()
        .single();

      if (insertError) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        return { error: insertError.message || "Failed to send" };
      }

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? (data as ChatMessage) : m))
        );
      }

      return { error: null };
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      return { error: e.message || "Failed to send" };
    } finally {
      setSending(false);
    }
  };

  return { messages, loading, sending, sendMessage, refetch: fetchMessages };
}
