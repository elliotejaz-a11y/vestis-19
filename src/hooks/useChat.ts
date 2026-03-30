import { useState, useEffect, useCallback } from "react";
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
      .select("id, sender_id, receiver_id, content, read, created_at, is_flagged, flag_reason")
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

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
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
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    }
  }, [user, friendId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!user || !friendId) return;
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
              supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {});
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

    return () => { supabase.removeChannel(channel); };
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
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ receiverId: friendId, content: content.trim() }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        return { error: result.error || result.reason || "Failed to send" };
      }

      // Replace optimistic message with real one
      if (result.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? (result.message as ChatMessage) : m))
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
