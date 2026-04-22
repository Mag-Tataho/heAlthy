import React from 'react';
import Settings from './Settings';
import {
  ChartNoAxesColumn,
  MessageCircle,
  ShieldOff,
  Sparkles,
  UtensilsCrossed,
} from '../components/OpenMojiIcons';

export default function Upgrade() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card animate-fadeIn bg-gradient-to-br from-amber-50 to-sage-50 dark:from-amber-900/20 dark:to-sage-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">Premium upgrade</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-sage-900 dark:text-white">Upgrade to Premium</h1>
            <p className="mt-2 text-sm text-sage-600 dark:text-gray-400">
              Unlock AI chat, personalized meal plans, advanced reports, and fewer restrictions.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { text: 'AI nutrition coach chat', icon: MessageCircle },
                { text: 'Personalized meal planning', icon: UtensilsCrossed },
                { text: 'Advanced progress reports', icon: ChartNoAxesColumn },
                { text: 'No advertisements', icon: ShieldOff },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-sage-700 dark:bg-gray-900/50 dark:text-gray-300">
                  <item.icon className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Settings embedded />
    </div>
  );
}