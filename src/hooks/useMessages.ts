import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export function useMessages({ supabase, userId }: { supabase: SupabaseClient | null; userId?: string }) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const channelRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!supabase || !userId) return;
    
    // Fetch last 500 messages involving this user
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    if (data) {
      const reversedData = data.reverse();
      setMessages(reversedData);
      
      // Calculate unread counts
      const unread: Record<string, number> = {};
      reversedData.forEach(msg => {
        if (!msg.read && msg.receiver_id === userId) {
          unread[msg.sender_id] = (unread[msg.sender_id] || 0) + 1;
        }
      });
      setUnreadCounts(unread);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!supabase || !userId) return;

    // Subscribe to new messages where we are either sender or receiver
    const channel = supabase.channel(`direct_messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          setMessages(prev => {
             if (prev.some(m => m.id === newMsg.id)) return prev;
             return [...prev, newMsg];
          });
          setUnreadCounts(prev => ({
            ...prev,
            [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          setMessages(prev => {
             if (prev.some(m => m.id === newMsg.id)) return prev;
             return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          const updatedMsg = payload.new as DirectMessage;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          const updatedMsg = payload.new as DirectMessage;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          if (updatedMsg.read) {
             setUnreadCounts(prev => {
                const count = (prev[updatedMsg.sender_id] || 0) - 1;
                return { ...prev, [updatedMsg.sender_id]: Math.max(0, count) };
             });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    if (!supabase || !userId || !content.trim()) return;

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
    } else if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as DirectMessage]);
    }
  }, [supabase, userId]);

  const markAsRead = useCallback(async (senderId: string) => {
    if (!supabase || !userId) return;

    // Optimistically clear local unread count
    setUnreadCounts(prev => {
      if (!prev[senderId]) return prev;
      return { ...prev, [senderId]: 0 };
    });

    const { error } = await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [supabase, userId]);

  return {
    messages,
    unreadCounts,
    sendMessage,
    markAsRead,
  };
}
