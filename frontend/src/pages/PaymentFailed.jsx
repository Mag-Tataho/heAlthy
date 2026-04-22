import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Sparkles, X } from '../components/OpenMojiIcons';
import { useAuth } from '../context/AuthContext';

const PREMIUM_CHECKOUT_STORAGE_PREFIX = 'healthy_premium_checkout_';

const getPremiumCheckoutStorageKey = (userId) => {
  return `${PREMIUM_CHECKOUT_STORAGE_PREFIX}${userId}`;
};

export default function PaymentFailed() {
  const { user, confirmPremiumCheckout } = useAuth();
  const [status, setStatus] = useState('failed');
  const [message, setMessage] = useState('Your payment was cancelled or failed. You can try again anytime.');

  const storageKey = useMemo(() => {
    return user?._id ? getPremiumCheckoutStorageKey(user._id) : '';
  }, [user?._id]);

  const checkPaymentStatus = useCallback(async () => {
    if (!user) return;

    if (user.isPremium) {
      setStatus('success');
      setMessage('Your Premium access is already active.');
      return;
    }

    const checkoutSessionId = storageKey ? localStorage.getItem(storageKey) : '';
    if (!checkoutSessionId) {
      setStatus('failed');
      setMessage('No active checkout session was found. Please start a new payment.');
      return;
    }

    setStatus('checking');
    setMessage('Checking the latest payment status from PayMongo...');

    try {
      const data = await confirmPremiumCheckout(checkoutSessionId);

      if (data?.verified && data?.user?.isPremium) {
        localStorage.removeItem(storageKey);
        setStatus('success');
        setMessage('Payment succeeded. Thank you for upgrading to Premium.');
        return;
      }

      const lowerStatus = String(data?.status || '').toLowerCase();
      if (lowerStatus === 'failed' || lowerStatus === 'expired') {
        setStatus('failed');
        setMessage(data?.error || 'Payment was not completed. Please try again.');
        return;
      }

      setStatus('pending');
      setMessage(data?.message || 'Payment is still being processed. Please check again shortly.');
    } catch (err) {
      const apiMessage = err.response?.data?.error || err.message || 'Unable to check payment status right now.';
      const lower = String(apiMessage).toLowerCase();
      if (lower.includes('failed') || lower.includes('not completed') || lower.includes('expired')) {
        setStatus('failed');
      } else {
        setStatus('pending');
      }
      setMessage(apiMessage);
    }
  }, [confirmPremiumCheckout, storageKey, user]);

  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  const isSuccess = status === 'success';
  const isChecking = status === 'checking';
  const isPending = status === 'pending';
  const isFailed = status === 'failed';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card animate-fadeIn text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-300">
          {isSuccess && <Sparkles className="h-8 w-8" aria-hidden="true" />}
          {(isChecking || isPending) && <Clock3 className="h-8 w-8" aria-hidden="true" />}
          {isFailed && <X className="h-8 w-8" aria-hidden="true" />}
        </div>

        <h1 className="mt-4 font-display text-2xl font-semibold text-sage-900 dark:text-white">
          {isSuccess && 'Payment Completed'}
          {isChecking && 'Checking Payment Status'}
          {isPending && 'Payment Is Processing'}
          {isFailed && 'Payment Failed or Cancelled'}
        </h1>

        <p className="mt-2 text-sm text-sage-600 dark:text-gray-400">{message}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={checkPaymentStatus}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Check Again
          </button>

          <Link
            to={isSuccess ? '/dashboard' : '/profile'}
            className="btn-primary inline-flex items-center justify-center"
          >
            {isSuccess ? 'Go to Dashboard' : 'Try Payment Again'}
          </Link>
        </div>
      </div>
    </div>
  );
}