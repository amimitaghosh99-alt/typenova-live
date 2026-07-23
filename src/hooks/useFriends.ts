import { useState, useCallback, useEffect } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export interface UseFriendsOptions {
  supabase: SupabaseClient | null;
  session: Session | null;
}

export const useFriends = ({ supabase, session }: UseFriendsOptions) => {
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!supabase || !session?.user.id) {
      setFriends([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('user_friends')
        .select('friend_username')
        .eq('user_id', session.user.id);
      
      if (err) throw err;
      if (data) {
        setFriends(data.map(d => d.friend_username));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch friends');
      console.error('Friends fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

  const addFriend = useCallback(async (username: string) => {
    if (!supabase || !session?.user.id) return false;
    
    // Check if already friend locally
    if (friends.some(f => f.toLowerCase() === username.toLowerCase())) {
      setError('ALREADY FOLLOWING THIS USER.');
      setTimeout(() => setError(null), 3000);
      return false;
    }

    // Optimistic update
    const current = [...friends];
    setFriends([...current, username]);

    try {
      const { error: err } = await supabase
        .from('user_friends')
        .insert({ user_id: session.user.id, friend_username: username });
      
      if (err) throw err;
      setError(null);
      return true;
    } catch (err: any) {
      // Revert on error
      setFriends(current);
      let msg = err.message || 'FAILED TO ADD FRIEND';
      if (msg.toLowerCase().includes('duplicate key') || msg.toLowerCase().includes('unique constraint')) {
        msg = 'ALREADY FOLLOWING THIS USER.';
      } else if (msg.toLowerCase().includes('foreign key constraint')) {
        msg = 'USER DOES NOT EXIST.';
      }
      setError(msg.toUpperCase());
      setTimeout(() => setError(null), 3000);
      return false;
    }
  }, [supabase, session, friends]);

  const removeFriend = useCallback(async (username: string) => {
    if (!supabase || !session?.user.id) return false;
    
    // Optimistic update
    const current = [...friends];
    setFriends(current.filter(u => u !== username));

    try {
      const { error: err } = await supabase
        .from('user_friends')
        .delete()
        .eq('user_id', session.user.id)
        .eq('friend_username', username);
      
      if (err) throw err;
      return true;
    } catch (err: any) {
      // Revert on error
      setFriends(current);
      setError(err.message || 'Failed to remove friend');
      return false;
    }
  }, [supabase, session, friends]);

  // Fetch on mount or session change
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    loading,
    error,
    setError,
    addFriend,
    removeFriend,
    refreshFriends: fetchFriends
  };
};
