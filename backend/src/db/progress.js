const { supabase, assertSupabaseConfigured } = require('../config/supabase');

const TABLE = 'progress_entries';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const toProgressEntry = (row = {}) => ({
  _id: row._id,
  user: row.user_id,
  date: row.date,
  weight: row.weight,
  calories: row.calories,
  water: row.water,
  protein: row.protein,
  carbs: row.carbs,
  fat: row.fat,
  workout: row.workout || {},
  notes: row.notes || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createProgressEntry = async ({ userId, ...data }) => {
  const payload = {
    user_id: userId,
    date: data.date || new Date().toISOString(),
    weight: data.weight ?? null,
    calories: data.calories ?? null,
    water: data.water ?? null,
    protein: data.protein ?? null,
    carbs: data.carbs ?? null,
    fat: data.fat ?? null,
    workout: data.workout || {},
    notes: data.notes || null,
  };

  const { data: row, error } = await client()
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return toProgressEntry(row);
};

const listProgressEntries = async (userId, { limit = 30 } = {}) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(Number(limit) || 30);

  if (error) throw error;
  return (data || []).map(toProgressEntry);
};

const deleteProgressEntry = async (userId, entryId) => {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq('_id', entryId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toProgressEntry(data) : null;
};

module.exports = {
  toProgressEntry,
  createProgressEntry,
  listProgressEntries,
  deleteProgressEntry,
};