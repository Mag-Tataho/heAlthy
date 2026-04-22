const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const { getUserById, listUsersByIds, setFriendsForUser, searchUsers } = require('./users');

const TABLE = 'friend_requests';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const toFriendRequest = (row = {}) => ({
  _id: row._id,
  from: row.from_user_id,
  to: row.to_user_id,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getFriendIds = (user = {}) => {
  return Array.isArray(user.friends) ? user.friends.map(String) : [];
};

const listFriendsForUser = async (userId) => {
  const user = await getUserById(userId);
  if (!user) return [];

  const friends = await listUsersByIds(user.friends || []);
  return friends;
};

const areFriends = async (userId, otherUserId) => {
  const user = await getUserById(userId);
  if (!user) return false;
  return getFriendIds(user).includes(String(otherUserId));
};

const findPendingFriendRequest = async (fromUserId, toUserId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('status', 'pending')
    .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
    .maybeSingle();

  if (error) throw error;
  return data ? toFriendRequest(data) : null;
};

const listIncomingRequests = async (userId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toFriendRequest);
};

const listSentRequests = async (userId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toFriendRequest);
};

const createFriendRequest = async ({ fromUserId, toUserId }) => {
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return toFriendRequest(data);
};

const acceptFriendRequest = async ({ requestId, userId }) => {
  const { data: request, error: requestError } = await client()
    .from(TABLE)
    .select('*')
    .eq('_id', requestId)
    .eq('to_user_id', userId)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!request) return null;

  const currentUser = await getUserById(userId);
  const otherUser = await getUserById(request.from_user_id);
  if (!currentUser || !otherUser) return null;

  const userFriends = Array.from(new Set([...(currentUser.friends || []).map(String), String(request.from_user_id)]));
  const otherFriends = Array.from(new Set([...(otherUser.friends || []).map(String), String(userId)]));

  await client().from(TABLE).update({ status: 'accepted' }).eq('_id', requestId);
  await setFriendsForUser(userId, userFriends);
  await setFriendsForUser(request.from_user_id, otherFriends);

  return toFriendRequest({ ...request, status: 'accepted' });
};

const declineFriendRequest = async ({ requestId, userId }) => {
  const { data, error } = await client()
    .from(TABLE)
    .update({ status: 'declined' })
    .eq('_id', requestId)
    .eq('to_user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toFriendRequest(data) : null;
};

const removeFriend = async ({ userId, friendId }) => {
  const user = await getUserById(userId);
  const friend = await getUserById(friendId);
  if (!user || !friend) return null;

  const userFriends = (user.friends || []).map(String).filter((id) => String(id) !== String(friendId));
  const friendFriends = (friend.friends || []).map(String).filter((id) => String(id) !== String(userId));

  await setFriendsForUser(userId, userFriends);
  await setFriendsForUser(friendId, friendFriends);
  return true;
};

const searchFriends = async ({ q, excludeUserId, limit = 10 }) => {
  return searchUsers({ q, excludeUserId, limit });
};

module.exports = {
  toFriendRequest,
  listFriendsForUser,
  areFriends,
  findPendingFriendRequest,
  listIncomingRequests,
  listSentRequests,
  createFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchFriends,
};