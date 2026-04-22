const crypto = require('crypto');
const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const { listUsersByIds } = require('./users');

const MESSAGES_TABLE = 'messages';
const GROUPS_TABLE = 'groups';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const newId = () => crypto.randomUUID();

const toMessage = (row = {}) => ({
  _id: row._id,
  sender: row.sender_id,
  recipient: row.recipient_id || null,
  group: row.group_id || null,
  text: row.text,
  readBy: Array.isArray(row.read_by) ? row.read_by : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toGroup = (row = {}) => ({
  _id: row._id,
  name: row.name,
  description: row.description || '',
  creator: row.creator_id,
  members: Array.isArray(row.members) ? row.members : [],
  admins: Array.isArray(row.admins) ? row.admins : [],
  emoji: row.emoji || 'Dumbbell',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildDmThreadFilter = (userId, otherUserId) => {
  return `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`;
};

const hydrateMessages = async (messages = []) => {
  const userIds = new Set();
  messages.forEach((message) => {
    if (message.sender) userIds.add(String(message.sender));
    if (message.recipient) userIds.add(String(message.recipient));
  });
  const users = await listUsersByIds([...userIds]);
  const userMap = new Map(users.map((user) => [user._id, { _id: user._id, name: user.name, isPremium: user.isPremium, avatarUrl: user.avatarUrl }]));

  return messages.map((message) => ({
    ...message,
    sender: userMap.get(String(message.sender)) || null,
    recipient: message.recipient ? (userMap.get(String(message.recipient)) || null) : null,
  }));
};

const hydrateGroups = async (groups = []) => {
  const userIds = new Set();
  groups.forEach((group) => {
    if (group.creator) userIds.add(String(group.creator));
    (group.members || []).forEach((id) => userIds.add(String(id)));
  });
  const users = await listUsersByIds([...userIds]);
  const userMap = new Map(users.map((user) => [user._id, { _id: user._id, name: user.name, isPremium: user.isPremium, avatarUrl: user.avatarUrl }]));

  return groups.map((group) => ({
    ...group,
    creator: userMap.get(String(group.creator)) || null,
    members: (group.members || []).map((id) => userMap.get(String(id)) || { _id: id }),
  }));
};

const listDmMessages = async ({ userId, otherUserId, limit = 100 }) => {
  const { data, error } = await client()
    .from(MESSAGES_TABLE)
    .select('*')
    .is('group_id', null)
    .or(buildDmThreadFilter(userId, otherUserId))
    .order('created_at', { ascending: true })
    .limit(Number(limit) || 100);

  if (error) throw error;
  return hydrateMessages((data || []).map(toMessage));
};

const markDmMessagesRead = async ({ senderId, recipientId, readerId }) => {
  const { data, error } = await client()
    .from(MESSAGES_TABLE)
    .select('*')
    .is('group_id', null)
    .or(buildDmThreadFilter(recipientId, senderId))
    .order('created_at', { ascending: true });

  if (error) throw error;

  const messages = (data || []).map(toMessage);
  const unread = messages.filter((message) => {
    const messageSenderId = String(message.sender?._id || message.sender);
    const messageRecipientId = String(message.recipient?._id || message.recipient || recipientId);
    const alreadyRead = message.readBy.map(String).includes(String(readerId));
    return messageSenderId === String(senderId) && messageRecipientId === String(recipientId) && !alreadyRead;
  });

  if (!unread.length) return 0;

  const updates = unread.map((message) =>
    client().from(MESSAGES_TABLE).update({ read_by: [...new Set([...(message.readBy || []).map(String), String(readerId)])] }).eq('_id', message._id)
  );
  await Promise.all(updates);
  return unread.length;
};

const createDmMessage = async ({ senderId, recipientId, text }) => {
  const { data, error } = await client()
    .from(MESSAGES_TABLE)
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      group_id: null,
      text,
      read_by: [],
    })
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateMessages([toMessage(data)]);
  return hydrated;
};

const listConversationUserIds = async (userId) => {
  const { data: sent, error: sentError } = await client()
    .from(MESSAGES_TABLE)
    .select('recipient_id')
    .eq('sender_id', userId)
    .is('group_id', null);
  if (sentError) throw sentError;

  const { data: received, error: receivedError } = await client()
    .from(MESSAGES_TABLE)
    .select('sender_id')
    .eq('recipient_id', userId)
    .is('group_id', null);
  if (receivedError) throw receivedError;

  return [...new Set([...(sent || []).map((item) => item.recipient_id), ...(received || []).map((item) => item.sender_id)].filter(Boolean).map(String))];
};

const listConversationSummaries = async (userId) => {
  const userIds = await listConversationUserIds(userId);
  const users = await listUsersByIds(userIds);

  const summaries = await Promise.all(users.map(async (user) => {
    const { data, error } = await client()
      .from(MESSAGES_TABLE)
      .select('*')
      .is('group_id', null)
      .or(buildDmThreadFilter(userId, user._id))
      .order('created_at', { ascending: true });

    if (error) throw error;

    const conversationMessages = (data || []).map(toMessage);
    const lastMessage = conversationMessages[conversationMessages.length - 1] || null;
    const unread = conversationMessages.filter((message) => {
      const messageSenderId = String(message.sender?._id || message.sender);
      const messageRecipientId = String(message.recipient?._id || message.recipient || userId);
      const alreadyRead = message.readBy.map(String).includes(String(userId));
      return messageSenderId === String(user._id) && messageRecipientId === String(userId) && !alreadyRead;
    }).length;

    return {
      user: { _id: user._id, name: user.name, email: user.email, isPremium: user.isPremium },
      lastMessage,
      unread,
    };
  }));

  summaries.sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
  return summaries;
};

const listGroupsForUser = async (userId) => {
  const { data, error } = await client()
    .from(GROUPS_TABLE)
    .select('*')
    .contains('members', [userId])
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return hydrateGroups((data || []).map(toGroup));
};

const createGroup = async ({ name, description, emoji, creatorId, memberIds = [] }) => {
  const members = Array.from(new Set([creatorId, ...memberIds.map(String)]));
  const admins = [creatorId];

  const { data, error } = await client()
    .from(GROUPS_TABLE)
    .insert({
      name,
      description: description || null,
      creator_id: creatorId,
      members,
      admins,
      emoji: emoji || 'Dumbbell',
    })
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateGroups([toGroup(data)]);
  return hydrated;
};

const getGroupById = async (groupId) => {
  const { data, error } = await client()
    .from(GROUPS_TABLE)
    .select('*')
    .eq('_id', groupId)
    .maybeSingle();

  if (error) throw error;
  return data ? toGroup(data) : null;
};

const listGroupMessages = async ({ groupId, limit = 100 }) => {
  const { data, error } = await client()
    .from(MESSAGES_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(Number(limit) || 100);

  if (error) throw error;
  return hydrateMessages((data || []).map(toMessage));
};

const createGroupMessage = async ({ groupId, senderId, text }) => {
  const { data, error } = await client()
    .from(MESSAGES_TABLE)
    .insert({
      sender_id: senderId,
      recipient_id: null,
      group_id: groupId,
      text,
      read_by: [],
    })
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateMessages([toMessage(data)]);
  return hydrated;
};

const addMemberToGroup = async ({ groupId, userId }) => {
  const group = await getGroupById(groupId);
  if (!group) return null;
  const members = Array.from(new Set([...(group.members || []).map(String), String(userId)]));

  const { data, error } = await client()
    .from(GROUPS_TABLE)
    .update({ members })
    .eq('_id', groupId)
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateGroups([toGroup(data)]);
  return hydrated;
};

const removeMemberFromGroup = async ({ groupId, userId }) => {
  const group = await getGroupById(groupId);
  if (!group) return null;
  const members = (group.members || []).map(String).filter((memberId) => String(memberId) !== String(userId));

  const { data, error } = await client()
    .from(GROUPS_TABLE)
    .update({ members })
    .eq('_id', groupId)
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydrateGroups([toGroup(data)]);
  return hydrated;
};

module.exports = {
  toMessage,
  toGroup,
  hydrateMessages,
  hydrateGroups,
  listDmMessages,
  markDmMessagesRead,
  createDmMessage,
  listConversationUserIds,
  listConversationSummaries,
  listGroupsForUser,
  createGroup,
  getGroupById,
  listGroupMessages,
  createGroupMessage,
  addMemberToGroup,
  removeMemberFromGroup,
};