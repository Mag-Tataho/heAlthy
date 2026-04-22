const DEFAULT_PROFILE = {
  age: null,
  gender: null,
  height: null,
  weight: null,
  targetWeight: null,
  activityLevel: 'moderate',
  goal: 'maintain',
  budgetAmount: null,
  budgetPeriod: 'week',
  currency: 'PHP',
  allergies: [],
  dietaryRestrictions: [],
  cuisinePreferences: [],
  budget: 'moderate',
  region: null,
  fitnessActivities: [],
};

const DEFAULT_PRIVACY = {
  showProgress: true,
  showProfile: true,
  showGoal: true,
};

const DEFAULT_REMINDERS = {
  waterReminder: false,
  mealReminders: false,
  workoutReminders: false,
};

const ensureArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const toIsoOrNull = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const withDefaultProfile = (profile = {}) => {
  return {
    ...DEFAULT_PROFILE,
    ...(profile || {}),
    allergies: ensureArray(profile?.allergies),
    dietaryRestrictions: ensureArray(profile?.dietaryRestrictions),
    cuisinePreferences: ensureArray(profile?.cuisinePreferences),
    fitnessActivities: ensureArray(profile?.fitnessActivities),
  };
};

const toUserPayload = ({
  name,
  email,
  password,
  avatarUrl,
  passwordResetToken,
  passwordResetExpires,
  isPremium,
  premiumGrantedAt,
  premiumGrantedBy,
  friends,
  friendCount,
  profile,
  privacy,
  reminders,
} = {}) => {
  const payload = {};

  if (name !== undefined) payload.name = name;
  if (email !== undefined) payload.email = email;
  if (password !== undefined) payload.password = password;

  if (avatarUrl !== undefined) {
    payload.avatar_url = avatarUrl || null;
  }

  if (passwordResetToken !== undefined) {
    payload.password_reset_token = passwordResetToken || null;
  }

  if (passwordResetExpires !== undefined) {
    payload.password_reset_expires = toIsoOrNull(passwordResetExpires);
  }

  if (isPremium !== undefined) payload.is_premium = Boolean(isPremium);
  if (premiumGrantedAt !== undefined) payload.premium_granted_at = toIsoOrNull(premiumGrantedAt);
  if (premiumGrantedBy !== undefined) payload.premium_granted_by = premiumGrantedBy || null;

  if (friends !== undefined) {
    payload.friends = ensureArray(friends);
    payload.friend_count = friendCount !== undefined ? Number(friendCount) : payload.friends.length;
  } else if (friendCount !== undefined) {
    payload.friend_count = Number(friendCount);
  }

  if (profile !== undefined) payload.profile = withDefaultProfile(profile);
  if (privacy !== undefined) payload.privacy = { ...DEFAULT_PRIVACY, ...(privacy || {}) };
  if (reminders !== undefined) payload.reminders = { ...DEFAULT_REMINDERS, ...(reminders || {}) };

  return payload;
};

const toUser = (row = {}, { includePassword = false } = {}) => {
  const user = {
    _id: row._id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url || undefined,
    passwordResetToken: row.password_reset_token || undefined,
    passwordResetExpires: row.password_reset_expires || undefined,
    isPremium: Boolean(row.is_premium),
    premiumGrantedAt: row.premium_granted_at || undefined,
    premiumGrantedBy: row.premium_granted_by || undefined,
    friends: ensureArray(row.friends),
    friendCount: Number.isFinite(Number(row.friend_count))
      ? Number(row.friend_count)
      : ensureArray(row.friends).length,
    profile: withDefaultProfile(row.profile),
    privacy: { ...DEFAULT_PRIVACY, ...(row.privacy || {}) },
    reminders: { ...DEFAULT_REMINDERS, ...(row.reminders || {}) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    user.password = row.password;
  }

  return user;
};

const sanitizeUser = (user = {}) => {
  const cloned = { ...(user || {}) };
  delete cloned.password;
  delete cloned.passwordResetToken;
  delete cloned.passwordResetExpires;
  return cloned;
};

const unwrapData = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const mapDbError = (err, fallbackMessage = 'Database operation failed') => {
  const message = err?.message || fallbackMessage;
  const code = err?.code || null;
  return { message, code };
};

module.exports = {
  DEFAULT_PROFILE,
  DEFAULT_PRIVACY,
  DEFAULT_REMINDERS,
  ensureArray,
  toIsoOrNull,
  toUserPayload,
  toUser,
  sanitizeUser,
  unwrapData,
  mapDbError,
};