const crypto = require('crypto');
const { supabase, assertSupabaseConfigured } = require('../config/supabase');

const SIGNUP_OTPS_TABLE = 'signup_otps';

const requireSupabase = () => {
  assertSupabaseConfigured();

  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  return supabase;
};

const hashOtp = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const upsertSignupOtp = async ({ email, code, expiresAt }) => {
  const client = requireSupabase();
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    code_hash: hashOtp(code),
    expires_at: expiresAt,
  };

  const { data, error } = await client
    .from(SIGNUP_OTPS_TABLE)
    .upsert(payload, { onConflict: 'email' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const findSignupOtp = async ({ email, code }) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(SIGNUP_OTPS_TABLE)
    .select('*')
    .eq('email', String(email || '').trim().toLowerCase())
    .eq('code_hash', hashOtp(code))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data;
};

const deleteSignupOtpByEmail = async (email) => {
  const client = requireSupabase();
  const { error } = await client
    .from(SIGNUP_OTPS_TABLE)
    .delete()
    .eq('email', String(email || '').trim().toLowerCase());

  if (error) throw error;
  return true;
};

const findPasswordResetUserByCode = async ({ email, code }) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', String(email || '').trim().toLowerCase())
    .eq('password_reset_token', hashOtp(code))
    .gt('password_reset_expires', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data;
};

module.exports = {
  hashOtp,
  upsertSignupOtp,
  findSignupOtp,
  deleteSignupOtpByEmail,
  findPasswordResetUserByCode,
};