import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Sparkles, X } from '../components/OpenMojiIcons';
import { useAuth } from '../context/AuthContext';

const PREMIUM_CHECKOUT_STORAGE_PREFIX = 'healthy_premium_checkout_';

const getPremiumCheckoutStorageKey = (userId) => {
  return `${PREMIUM_CHECKOUT_STORAGE_PREFIX}${userId}`;
};

export default function PaymentSuccess() {
  const { user, confirmPremiumCheckout } = useAuth();
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Verifying your payment with PayMongo...');

  const storageKey = useMemo(() => {
    return user?._id ? getPremiumCheckoutStorageKey(user._id) : '';
  }, [user?._id]);

  const verifyPayment = useCallback(async () => {
    if (!user) return;

    if (user.isPremium) {
      setStatus('success');
      setMessage('Thank you for your payment. Your Premium access is already active.');
      return;
    }

    const checkoutSessionId = storageKey ? localStorage.getItem(storageKey) : '';
    if (!checkoutSessionId) {
      setStatus('missing');
      setMessage('We could not find your checkout session. Please open Profile and Settings to check your payment.');
      return;
    }

    setStatus('checking');
    setMessage('Verifying your payment with PayMongo...');

    try {
      const data = await confirmPremiumCheckout(checkoutSessionId);

      if (data?.verified && data?.user?.isPremium) {
        localStorage.removeItem(storageKey);
        setStatus('success');
        setMessage('Thank you for upgrading. Your Premium membership is now active.');
        return;
      }

      const lowerStatus = String(data?.status || '').toLowerCase();
      if (lowerStatus === 'failed' || lowerStatus === 'expired') {
        setStatus('failed');
        setMessage(data?.error || 'Payment was not completed. You can try again anytime.');
        return;
      }

      setStatus('pending');
      setMessage(data?.message || 'Your payment is still processing. Please check again in a moment.');
    } catch (err) {
      const apiMessage = err.response?.data?.error || err.message || 'Unable to verify payment right now.';
      const lower = String(apiMessage).toLowerCase();
      const failed = lower.includes('failed') || lower.includes('not completed') || lower.includes('expired');
      setStatus(failed ? 'failed' : 'pending');
      setMessage(apiMessage);
    }
  }, [confirmPremiumCheckout, storageKey, user]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  const isSuccess = status === 'success';
  const isChecking = status === 'checking';
  const isPending = status === 'pending';
  const isFailed = status === 'failed';
  const isMissing = status === 'missing';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card animate-fadeIn text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300">
          {isSuccess && <Sparkles className="h-8 w-8" aria-hidden="true" />}
          {isChecking && <Clock3 className="h-8 w-8" aria-hidden="true" />}
          {isPending && <Clock3 className="h-8 w-8" aria-hidden="true" />}
          {(isFailed || isMissing) && <X className="h-8 w-8" aria-hidden="true" />}
        </div>

        <h1 className="mt-4 font-display text-2xl font-semibold text-sage-900 dark:text-white">
          {isSuccess && 'Thank You for Your Payment'}
          {isChecking && 'Checking Payment Status'}
          {isPending && 'Payment Is Processing'}
          {isFailed && 'Payment Did Not Complete'}
          {isMissing && 'Checkout Session Not Found'}
        </h1>

        <p className="mt-2 text-sm text-sage-600 dark:text-gray-400">{message}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(isChecking || isPending || isFailed || isMissing) && (
            <button
              type="button"
              onClick={verifyPayment}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Check Again
            </button>
          )}

          <Link
            to={isSuccess ? '/dashboard' : '/profile'}
            className={isSuccess ? 'btn-primary inline-flex items-center justify-center' : 'btn-secondary inline-flex items-center justify-center'}
          >
            {isSuccess ? 'Go to Dashboard' : 'Go to Profile'}
          </Link>
        </div>
      </div>
    </div>
  );
}