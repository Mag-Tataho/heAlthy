const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const { ensureArray, sanitizeUser } = require('./helpers');
const { listUsersByIds } = require('./users');

const TABLE = 'custom_meals';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const toCustomMeal = (row = {}) => ({
  _id: row._id,
  user: row.user_id,
  name: row.name,
  description: row.description || '',
  calories: row.calories,
  protein: row.protein,
  carbs: row.carbs,
  fat: row.fat,
  fiber: row.fiber,
  serving: row.serving || '1 serving',
  ingredients: ensureArray(row.ingredients),
  category: row.category || 'other',
  mealTime: row.meal_time || 'any',
  isPublic: Boolean(row.is_public),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const hydrateMealsWithUsers = async (meals = []) => {
  const userIds = [...new Set(meals.map((meal) => meal.user).filter(Boolean))];
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((user) => [user._id, sanitizeUser({ _id: user._id, name: user.name, email: user.email, isPremium: user.isPremium })]));

  return meals.map((meal) => ({
    ...meal,
    user: userMap.get(meal.user) || null,
  }));
};

const listPublicMeals = async ({ q = '', limit = 20 } = {}) => {
  let query = client()
    .from(TABLE)
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 20);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return hydrateMealsWithUsers((data || []).map(toCustomMeal));
};

const listUserMeals = async (userId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toCustomMeal);
};

const createCustomMeal = async ({ userId, name, description, calories, protein, carbs, fat, fiber, serving, ingredients = [], category, mealTime, isPublic = false }) => {
  const payload = {
    user_id: userId,
    name,
    description: description || null,
    calories: calories ?? null,
    protein: protein ?? null,
    carbs: carbs ?? null,
    fat: fat ?? null,
    fiber: fiber ?? null,
    serving: serving || '1 serving',
    ingredients: ensureArray(ingredients),
    category: category || 'other',
    meal_time: mealTime || 'any',
    is_public: Boolean(isPublic),
  };

  const { data, error } = await client()
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return toCustomMeal(data);
};

const updateCustomMeal = async (mealId, userId, updates = {}) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(updates, 'name')) payload.name = updates.name;
  if (Object.prototype.hasOwnProperty.call(updates, 'description')) payload.description = updates.description || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'calories')) payload.calories = updates.calories ?? null;
  if (Object.prototype.hasOwnProperty.call(updates, 'protein')) payload.protein = updates.protein ?? null;
  if (Object.prototype.hasOwnProperty.call(updates, 'carbs')) payload.carbs = updates.carbs ?? null;
  if (Object.prototype.hasOwnProperty.call(updates, 'fat')) payload.fat = updates.fat ?? null;
  if (Object.prototype.hasOwnProperty.call(updates, 'fiber')) payload.fiber = updates.fiber ?? null;
  if (Object.prototype.hasOwnProperty.call(updates, 'serving')) payload.serving = updates.serving || '1 serving';
  if (Object.prototype.hasOwnProperty.call(updates, 'ingredients')) payload.ingredients = ensureArray(updates.ingredients);
  if (Object.prototype.hasOwnProperty.call(updates, 'category')) payload.category = updates.category || 'other';
  if (Object.prototype.hasOwnProperty.call(updates, 'mealTime')) payload.meal_time = updates.mealTime || 'any';
  if (Object.prototype.hasOwnProperty.call(updates, 'isPublic')) payload.is_public = Boolean(updates.isPublic);

  const { data, error } = await client()
    .from(TABLE)
    .update(payload)
    .eq('_id', mealId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toCustomMeal(data) : null;
};

const deleteCustomMeal = async (mealId, userId) => {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq('_id', mealId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toCustomMeal(data) : null;
};

module.exports = {
  toCustomMeal,
  listPublicMeals,
  listUserMeals,
  createCustomMeal,
  updateCustomMeal,
  deleteCustomMeal,
  hydrateMealsWithUsers,
};