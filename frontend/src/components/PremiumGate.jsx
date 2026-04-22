import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from './OpenMojiIcons';

export default function PremiumGate({ children, featureName }) {
  const { user } = useAuth();
  const isPremium = Boolean(user?.isPremium);
  const label = String(featureName || 'this feature').trim() || 'this feature';
  const ctaText = `Unlock ${label} — Upgrade to Premium`;

  if (isPremium) {
    return children;
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm grayscale opacity-50">
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white/90 p-6 text-center shadow-2xl dark:border-gray-700 dark:bg-gray-900/95">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">Premium required</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-sage-900 dark:text-white">Unlock {label}</h3>
          <p className="mt-2 text-sm text-sage-600 dark:text-gray-300">
            This feature is blurred because it is only available to Premium members.
          </p>
          <Link
            to="/profile"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </div>
  );
}