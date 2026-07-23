import { useState, useCallback, useEffect } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export interface UseFriendsOptions {
  supabase: SupabaseClient | null;
  session: Session | null;
  username: string | null;
}

export const useFriends = ({ supabase, session, username }: UseFriendsOptions) => {
  const [friends, setFriends] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<string[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!supabase || !session?.user.id) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    setLoading(true);
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
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', idArray);
          
        if (profErr) throw profErr;

        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => { profileMap[p.id] = p.username; });

        const acc: string[] = [];
        const inc: string[] = [];
        const out: string[] = [];

        data.forEach(row => {
          const isSender = row.user_id === userId;
          const otherId = isSender ? row.friend_id : row.user_id;
          const otherUsername = profileMap[otherId];
          
          if (!otherUsername) return;

          if (row.status === 'accepted') {
            if (!acc.includes(otherUsername)) acc.push(otherUsername);
          } else if (row.status === 'pending') {
            if (isSender) {
              out.push(otherUsername);
            } else {
              inc.push(otherUsername);
            }
          }
        });

        setFriends(acc);
        setIncomingRequests(inc);
        setOutgoingRequests(out);
      } else {
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch friends');
      console.error('Friends fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

  const addFriend = useCallback(async (targetUsername: string) => {
    if (!supabase || !session?.user.id || !username) return false;
    
    const lowerTarget = targetUsername.toLowerCase();
    if (friends.some(f => f.toLowerCase() === lowerTarget)) {
      setError('ALREADY FRIENDS WITH THIS USER.');
      setTimeout(() => setError(null), 3000);
      return false;
    }
    if (outgoingRequests.some(f => f.toLowerCase() === lowerTarget)) {
      setError('REQUEST ALREADY SENT.');
      setTimeout(() => setError(null), 3000);
      return false;
    }

    setLoading(true);
    try {
      // Find the friend's user_id
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', targetUsername)
        .single();
      
      if (profileErr || !profile) throw new Error('USER DOES NOT EXIST.');
      if (profile.id === session.user.id) throw new Error("CANNOT ADD YOURSELF.");

      // Check if they already sent us a request
      if (incomingRequests.some(f => f.toLowerCase() === lowerTarget)) {
        throw new Error('THEY ALREADY SENT YOU A REQUEST. CHECK INBOX.');
      }

      const { error: err } = await supabase
        .from('friendships')
        .insert({ user_id: session.user.id, friend_id: profile.id, status: 'pending' });
      
      if (err) throw err;
      
      setError(null);
      setOutgoingRequests(prev => [...prev, profile.username]);
      return true;
    } catch (err: unknown) {
      let msg = (err as Error).message || 'FAILED TO SEND REQUEST';
      if (msg.toLowerCase().includes('duplicate key') || msg.toLowerCase().includes('unique constraint')) {
        msg = 'REQUEST ALREADY SENT OR FRIENDS.';
      }
      setError(msg.toUpperCase());
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, friends, outgoingRequests, incomingRequests, username]);

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
      setFriends(prev => [...prev, senderUsername]);
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to accept request');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

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

      setFriends(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriends();
  }, [fetchFriends]);

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
