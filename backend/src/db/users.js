const bcrypt = require('bcryptjs');
const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const {
  toUser,
  toUserPayload,
  ensureArray,
} = require('./helpers');

const USERS_TABLE = 'users';

const requireSupabase = () => {
  assertSupabaseConfigured();

  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  return supabase;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const selectUserQuery = (query, { includePassword = false } = {}) => {
  if (includePassword) {
    return query;
  }

  return query;
};

const getUserById = async (userId, { includePassword = false } = {}) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('*')
    .eq('_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data, { includePassword }) : null;
};

const getUserByEmail = async (email, { includePassword = false } = {}) => {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data, { includePassword }) : null;
};

const listUsersByIds = async (userIds = [], { includePassword = false } = {}) => {
  const ids = ensureArray(userIds).filter(Boolean);
  if (!ids.length) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('*')
    .in('_id', ids);

  if (error) throw error;
  return (data || []).map((row) => toUser(row, { includePassword }));
};

const createUser = async ({ name, email, password, avatarUrl, profile, privacy, reminders, isPremium = false } = {}) => {
  const client = requireSupabase();
  const hashedPassword = await bcrypt.hash(String(password || ''), 12);
  const payload = toUserPayload({
    name,
    email: normalizeEmail(email),
    password: hashedPassword,
    avatarUrl,
    profile,
    privacy,
    reminders,
    isPremium,
  });

  const { data, error } = await client
    .from(USERS_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return toUser(data);
};

const updateUserById = async (userId, updates = {}) => {
  const client = requireSupabase();
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) payload.name = updates.name;
  if (Object.prototype.hasOwnProperty.call(updates, 'email')) payload.email = normalizeEmail(updates.email);
  if (Object.prototype.hasOwnProperty.call(updates, 'password')) payload.password = updates.password;
  if (Object.prototype.hasOwnProperty.call(updates, 'avatarUrl')) payload.avatar_url = updates.avatarUrl || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'passwordResetToken')) payload.password_reset_token = updates.passwordResetToken || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'passwordResetExpires')) payload.password_reset_expires = updates.passwordResetExpires || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'isPremium')) payload.is_premium = Boolean(updates.isPremium);
  if (Object.prototype.hasOwnProperty.call(updates, 'premiumGrantedAt')) payload.premium_granted_at = updates.premiumGrantedAt || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'premiumGrantedBy')) payload.premium_granted_by = updates.premiumGrantedBy || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'profile')) payload.profile = updates.profile;
  if (Object.prototype.hasOwnProperty.call(updates, 'privacy')) payload.privacy = updates.privacy;
  if (Object.prototype.hasOwnProperty.call(updates, 'reminders')) payload.reminders = updates.reminders;
  if (Object.prototype.hasOwnProperty.call(updates, 'friends')) payload.friends = ensureArray(updates.friends);
  if (Object.prototype.hasOwnProperty.call(updates, 'friendCount')) payload.friend_count = updates.friendCount;

  const { data, error } = await client
    .from(USERS_TABLE)
    .update(payload)
    .eq('_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return toUser(data);
};

const updateUserPassword = async (userId, password) => {
  const hashed = await bcrypt.hash(password, 12);
  return updateUserById(userId, { password: hashed });
};

const setPremiumForUser = async (userId, { grantedBy = 'paymongo' } = {}) => {
  return updateUserById(userId, {
    isPremium: true,
    premiumGrantedAt: new Date().toISOString(),
    premiumGrantedBy: grantedBy,
  });
};

const setResetTokenForUser = async (userId, tokenHash, expiresAt) => {
  return updateUserById(userId, {
    passwordResetToken: tokenHash,
    passwordResetExpires: expiresAt,
  });
};

const clearResetTokenForUser = async (userId) => {
  return updateUserById(userId, {
    passwordResetToken: null,
    passwordResetExpires: null,
  });
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

const searchUsers = async ({ q, excludeUserId, limit = 10 } = {}) => {
  const client = requireSupabase();
  const term = String(q || '').trim();
  if (!term || term.length < 2) return [];

  let query = client.from(USERS_TABLE).select('*').limit(limit);
  query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  if (excludeUserId) query = query.neq('_id', excludeUserId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => toUser(row));
};

const setFriendsForUser = async (userId, friends = []) => {
  return updateUserById(userId, {
    friends,
    friendCount: ensureArray(friends).length,
  });
};

module.exports = {
  getUserById,
  getUserByEmail,
  listUsersByIds,
  createUser,
  updateUserById,
  updateUserPassword,
  setPremiumForUser,
  setResetTokenForUser,
  clearResetTokenForUser,
  hashPassword,
  comparePassword,
  searchUsers,
  setFriendsForUser,
  normalizeEmail,
};