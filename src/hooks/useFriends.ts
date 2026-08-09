import { useState, useCallback, useEffect, useRef } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export interface UseFriendsOptions {
  supabase: SupabaseClient | null;
  session: Session | null;
  username: string | null;
}

export interface FriendData {
  id: string;
  username: string;
  isOnline: boolean;
  elo: number;
  avatar_id?: string;
}

export const useFriends = ({ supabase, session, username }: UseFriendsOptions) => {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<string[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCount = useRef(0);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorTimeout = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  const setErrorWithTimeout = useCallback((msg: string | null) => {
    clearErrorTimeout();
    setError(msg);
    if (msg) {
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 3000);
    }
  }, [clearErrorTimeout]);

  useEffect(() => {
    return () => {
      clearErrorTimeout();
    };
  }, [clearErrorTimeout]);

  const fetchFriends = useCallback(async (silent = false) => {
    fetchCount.current += 1;
    const currentFetch = fetchCount.current;

    if (!supabase || !session?.user.id) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    if (!silent) setLoading(true);
    clearErrorTimeout();
    setError(null);
    try {
      const userId = session.user.id;
      // Fetch all friendships involving this user
      const { data, error: err } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      
      if (err) throw err;
      
      if (data && data.length > 0) {
        // Collect all unique user IDs to fetch their usernames
        const idSet = new Set<string>();
        data.forEach(row => {
          if (row.user_id !== userId) idSet.add(row.user_id);
          if (row.friend_id !== userId) idSet.add(row.friend_id);
        });

        const idArray = Array.from(idSet);
        const profilesList = [];
        const chunkSize = 40;
        for (let i = 0; i < idArray.length; i += chunkSize) {
          const chunk = idArray.slice(i, i + chunkSize);
          const { data: chunkData, error: profErr } = await supabase
            .from('profiles')
            .select('id, username, last_seen, elo')
            .in('id', chunk);
          if (profErr) throw profErr;
          if (chunkData) profilesList.push(...chunkData);
        }

        const profileMap: Record<string, FriendData> = {};
        const now = new Date().getTime();
        profilesList.forEach(p => { 
          const lastSeenTime = p.last_seen ? new Date(p.last_seen).getTime() : 0;
          // Online if last_seen was within the last 2 minutes (120,000 ms)
          const isOnline = (now - lastSeenTime) < 120000;
          profileMap[p.id] = { id: p.id, username: p.username, isOnline, elo: p.elo ?? 1000, avatar_id: 'default' }; 
        });



        const acc: FriendData[] = [];
        const inc: string[] = [];
        const out: string[] = [];

        data.forEach(row => {
          const isSender = row.user_id === userId;
          const otherId = isSender ? row.friend_id : row.user_id;
          const otherProfile = profileMap[otherId];
          
          if (!otherProfile) return;

          if (row.status === 'accepted') {
            if (!acc.some(f => f.username === otherProfile.username)) {
              acc.push(otherProfile);
            }
          } else if (row.status === 'pending') {
            if (isSender) {
              out.push(otherProfile.username);
            } else {
              inc.push(otherProfile.username);
            }
          }
        });

        if (fetchCount.current !== currentFetch) return;

        setFriends(acc);
        setIncomingRequests(inc);
        setOutgoingRequests(out);
      } else {
        if (fetchCount.current !== currentFetch) return;
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
      }
    } catch (err: unknown) {
      if (fetchCount.current !== currentFetch) return;
      setError((err as Error).message || 'Failed to fetch friends');
      console.error('Friends fetch error:', err);
    } finally {
      if (fetchCount.current === currentFetch && !silent) setLoading(false);
    }
  }, [supabase, session]);

  const addFriend = useCallback(async (targetUsername: string) => {
    if (!supabase || !session?.user.id || !username) return false;
    
    const lowerTarget = targetUsername.toLowerCase();
    if (friends.some(f => f.username.toLowerCase() === lowerTarget)) {
      setErrorWithTimeout('ALREADY FRIENDS WITH THIS USER.');
      return false;
    }
    if (outgoingRequests.some(f => f.toLowerCase() === lowerTarget)) {
      setErrorWithTimeout('REQUEST ALREADY SENT.');
      return false;
    }

    setLoading(true);
    try {
      // Find the friend's user_id
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', targetUsername)
        .limit(1)
        .maybeSingle();
      
      if (profileErr) {
        console.error("Profile fetch error:", profileErr);
        throw new Error(`DB ERROR: ${profileErr.message}`);
      }
      if (!profile) throw new Error('USER DOES NOT EXIST.');
      if (profile.id === session.user.id) throw new Error("CANNOT ADD YOURSELF.");

      // Check if they already sent us a request
      if (incomingRequests.some(f => f.toLowerCase() === lowerTarget)) {
        throw new Error('THEY ALREADY SENT YOU A REQUEST. CHECK INBOX.');
      }

      const { error: err } = await supabase
        .from('friendships')
        .insert({ user_id: session.user.id, friend_id: profile.id, status: 'pending' });
      
      if (err) throw err;
      
      clearErrorTimeout();
      setError(null);
      setOutgoingRequests(prev => [...prev, profile.username]);
      return true;
    } catch (err: unknown) {
      let msg = (err as Error).message || 'FAILED TO SEND REQUEST';
      if (msg.toLowerCase().includes('duplicate key') || msg.toLowerCase().includes('unique constraint')) {
        msg = 'REQUEST ALREADY SENT OR FRIENDS.';
      }
      setErrorWithTimeout(msg.toUpperCase());
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, friends, outgoingRequests, incomingRequests, username, setErrorWithTimeout, clearErrorTimeout]);

  const acceptRequest = useCallback(async (senderUsername: string) => {
    if (!supabase || !session?.user.id) return false;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', senderUsername)
        .single();
        
      if (!profile) throw new Error('Sender profile not found');

      const { error: err } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', profile.id)
        .eq('friend_id', session.user.id);
        
      if (err) throw err;
      
      setIncomingRequests(prev => prev.filter(u => u.toLowerCase() !== senderUsername.toLowerCase()));
      // Optimistic update removed; the postgres_changes listener will instantly call fetchFriends and populate this correctly
      return true;
    } catch (err: unknown) {
      setErrorWithTimeout((err as Error).message || 'Failed to accept request');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, setErrorWithTimeout]);

  const removeFriendOrRequest = useCallback(async (targetUsername: string, isIncoming: boolean = false) => {
    if (!supabase || !session?.user.id) return false;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', targetUsername)
        .single();
        
      if (!profile) throw new Error("User not found");

      if (isIncoming) {
        // Decline incoming request (they are user_id, we are friend_id)
        await supabase
          .from('friendships')
          .delete()
          .eq('user_id', profile.id)
          .eq('friend_id', session.user.id);
      } else {
        // Delete outgoing request OR accepted friendship
        // Since we don't know who initiated an accepted friendship, try both directions
        await supabase
          .from('friendships')
          .delete()
          .eq('user_id', session.user.id)
          .eq('friend_id', profile.id);

        await supabase
          .from('friendships')
          .delete()
          .eq('user_id', profile.id)
          .eq('friend_id', session.user.id);
      }

      setFriends(prev => prev.filter(u => u.username.toLowerCase() !== targetUsername.toLowerCase()));
      setIncomingRequests(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
      setOutgoingRequests(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to remove');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

  useEffect(() => {
    const initTimer = setTimeout(() => fetchFriends(), 0);

    if (!supabase || !session?.user.id) {
      return () => clearTimeout(initTimer);
    }

    const intervalId = setInterval(() => {
      fetchFriends(true);
    }, 60 * 1000);

    const userId = session.user.id;
    const channel = supabase
      .channel('friendships_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` },
        () => {
          fetchFriends(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${userId}` },
        () => {
          fetchFriends(true);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [supabase, session, fetchFriends]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    setError,
    addFriend,
    acceptRequest,
    removeFriend: removeFriendOrRequest,
    refreshFriends: fetchFriends
  };
};
