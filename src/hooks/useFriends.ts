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
      // Fetch both outgoing (where we are user_id) and incoming (where we are friend_username)
      // Since we updated the policy, we can just query everything we have access to
      const { data, error: err } = await supabase
        .from('user_friends')
        .select('user_id, friend_username, status');
      
      if (err) throw err;
      if (data) {
        const acc: string[] = [];
        const inc: string[] = [];
        const out: string[] = [];

        // To identify who the other person is, we need to know their username.
        // For outgoing requests/friends, the other person is `friend_username`.
        // For incoming requests, the other person's UUID is `user_id`, but we don't have their username here!
        // Actually, let's change the query to join profiles so we can get their username if it's incoming.
        
        // Let's do a more robust fetch using two queries to avoid foreign key schema cache issues
        const { data: incomingData, error: incErr } = await supabase
          .from('user_friends')
          .select('user_id, status')
          .eq('friend_username', username);

        if (incErr) throw incErr;

        let incomingProfiles: Record<string, string> = {};
        if (incomingData && incomingData.length > 0) {
          const userIds = incomingData.map(r => r.user_id);
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
          
          if (!profErr && profiles) {
            profiles.forEach(p => {
              incomingProfiles[p.id] = p.username;
            });
          }
        }

        const { data: outgoingData, error: outErr } = await supabase
          .from('user_friends')
          .select('friend_username, status')
          .eq('user_id', session.user.id);

        if (outErr) throw outErr;

        if (outgoingData) {
          outgoingData.forEach(row => {
            if (row.status === 'accepted') acc.push(row.friend_username);
            else if (row.status === 'pending') out.push(row.friend_username);
          });
        }

        if (incomingData) {
          incomingData.forEach(row => {
            const senderUsername = incomingProfiles[row.user_id];
            if (!senderUsername) return;
            
            if (row.status === 'accepted') {
              if (!acc.includes(senderUsername)) acc.push(senderUsername);
            } else if (row.status === 'pending') {
              inc.push(senderUsername);
            }
          });
        }

        setFriends(acc);
        setIncomingRequests(inc);
        setOutgoingRequests(out);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch friends');
      console.error('Friends fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, session, username]);

  const addFriend = useCallback(async (targetUsername: string) => {
    if (!supabase || !session?.user.id || !username) return false;
    
    // Check if already friend or pending locally
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
      // 1. Verify user exists in profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', targetUsername)
        .single();
      
      if (profileErr || !profile) {
        throw new Error('USER DOES NOT EXIST.');
      }

      // Use correct casing from their profile
      const exactUsername = profile.username;

      // 2. Insert request
      const { error: err } = await supabase
        .from('user_friends')
        .insert({ user_id: session.user.id, friend_username: exactUsername, status: 'pending' });
      
      if (err) throw err;
      
      setError(null);
      setOutgoingRequests(prev => [...prev, exactUsername]);
      return true;
    } catch (err: any) {
      let msg = err.message || 'FAILED TO SEND REQUEST';
      if (msg.toLowerCase().includes('duplicate key') || msg.toLowerCase().includes('unique constraint')) {
        msg = 'REQUEST ALREADY SENT OR FRIENDS.';
      } else if (msg.toLowerCase().includes('foreign key constraint')) {
        msg = 'USER DOES NOT EXIST.';
      }
      setError(msg.toUpperCase());
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, friends, outgoingRequests, username]);

  const acceptRequest = useCallback(async (senderUsername: string) => {
    if (!supabase || !session?.user.id || !username) return false;
    
    setLoading(true);
    try {
      // Find the user_id of the sender by looking up their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', senderUsername)
        .single();
        
      if (!profile) throw new Error('Sender profile not found');

      const { error: err } = await supabase
        .from('user_friends')
        .update({ status: 'accepted' })
        .eq('user_id', profile.id)
        .eq('friend_username', username);
        
      if (err) throw err;
      
      setIncomingRequests(prev => prev.filter(u => u.toLowerCase() !== senderUsername.toLowerCase()));
      setFriends(prev => [...prev, senderUsername]);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to accept request');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, username]);

  const removeFriendOrRequest = useCallback(async (targetUsername: string, isIncoming: boolean = false) => {
    if (!supabase || !session?.user.id || !username) return false;
    
    setLoading(true);
    try {
      if (isIncoming) {
        // If we are rejecting an incoming request or removing them as a friend (where they initiated)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', targetUsername)
          .single();
          
        if (profile) {
          await supabase
            .from('user_friends')
            .delete()
            .eq('user_id', profile.id)
            .eq('friend_username', username);
        }
      }
      
      // Also always try to delete where we initiated (outgoing request or we added them)
      await supabase
        .from('user_friends')
        .delete()
        .eq('user_id', session.user.id)
        .eq('friend_username', targetUsername);

      // Update state optimistically for all arrays
      setFriends(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
      setIncomingRequests(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
      setOutgoingRequests(prev => prev.filter(u => u.toLowerCase() !== targetUsername.toLowerCase()));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, session, username]);

  // Fetch on mount or session/username change
  useEffect(() => {
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
