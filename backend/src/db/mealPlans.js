const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const { ensureArray } = require('./helpers');

const TABLE = 'meal_plans';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const toMealPlan = (row = {}) => ({
  _id: row._id,
  user: row.user_id,
  title: row.title,
  type: row.type,
  duration: row.duration,
  plan: row.plan || {},
  groceryList: ensureArray(row.grocery_list),
  totalCalories: row.total_calories,
  isPremium: Boolean(row.is_premium),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const listMealPlansByUser = async (userId, { limit = 10 } = {}) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 10);

  if (error) throw error;
  return (data || []).map(toMealPlan);
};

const getMealPlanById = async (userId, mealPlanId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('_id', mealPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toMealPlan(data) : null;
};

const createMealPlan = async ({ userId, title, type, duration, plan, groceryList = [], totalCalories, isPremium = false }) => {
  const payload = {
    user_id: userId,
    title,
    type,
    duration,
    plan,
    grocery_list: ensureArray(groceryList),
    total_calories: totalCalories ?? null,
    is_premium: Boolean(isPremium),
  };

  const { data, error } = await client()
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return toMealPlan(data);
};

const deleteMealPlanById = async (userId, mealPlanId) => {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq('_id', mealPlanId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toMealPlan(data) : null;
};

module.exports = {
  toMealPlan,
  listMealPlansByUser,
  getMealPlanById,
  createMealPlan,
  deleteMealPlanById,
};