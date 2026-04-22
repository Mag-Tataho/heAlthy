const { supabase, assertSupabaseConfigured } = require('../config/supabase');

const TABLE = 'payments';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const toPayment = (row = {}) => ({
  _id: row._id,
  userId: row.user_id,
  sourceId: row.source_id,
  paymentId: row.payment_id || undefined,
  amount: row.amount,
  status: row.status || 'pending',
  paidAt: row.paid_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const upsertPayment = async ({ userId, sourceId, amount, status = 'pending' }) => {
  const { data, error } = await client()
    .from(TABLE)
    .upsert({
      user_id: userId,
      source_id: sourceId,
      amount,
      status,
    }, { onConflict: 'source_id' })
    .select('*')
    .single();

  if (error) throw error;
  return toPayment(data);
};

const getPaymentBySourceId = async (sourceId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPayment(data) : null;
};

const getPaymentByPaymentId = async (paymentId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPayment(data) : null;
};

const updatePayment = async (paymentIdOrSourceId, updates = {}, { by = 'source_id' } = {}) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(updates, 'paymentId')) payload.payment_id = updates.paymentId || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) payload.status = updates.status;
  if (Object.prototype.hasOwnProperty.call(updates, 'paidAt')) payload.paid_at = updates.paidAt || null;

  let query = client().from(TABLE).update(payload);
  query = by === 'payment_id' ? query.eq('payment_id', paymentIdOrSourceId) : query.eq('source_id', paymentIdOrSourceId);

  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  return data ? toPayment(data) : null;
};

const setPaymentPaid = async ({ sourceId, paymentId, paidAt }) => {
  const payment = await getPaymentBySourceId(sourceId);
  if (!payment) return null;

  return updatePayment(sourceId, {
    paymentId: paymentId || payment.paymentId,
    status: 'paid',
    paidAt: paidAt || new Date().toISOString(),
  });
};

module.exports = {
  toPayment,
  upsertPayment,
  getPaymentBySourceId,
  getPaymentByPaymentId,
  updatePayment,
  setPaymentPaid,
};