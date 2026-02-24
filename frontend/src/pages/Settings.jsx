import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

// Defined outside component - prevents remount on state change
const Toggle = ({ checked, onChange, label, desc }) => (
  <div className="flex items-center justify-between py-3 border-b border-sage-50 dark:border-gray-800 last:border-0">
    <div>
      <p className="text-sm font-medium text-sage-800 dark:text-gray-200">{label}</p>
      {desc && <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5">{desc}</p>}
    </div>
    <button onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center ${checked ? 'bg-sage-600 justify-end' : 'bg-sage-200 dark:bg-gray-700 justify-start'}`}>
      <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 block" />
    </button>
  </div>
);

export default function Settings() {
  const { user, updateUser, upgradeToPremiun, logout } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [reminders, setReminders] = useState(user?.reminders || {
    waterReminder: false, mealReminders: false, workoutReminders: false,
  });
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleReminderToggle = async (key) => {
    const updated = { ...reminders, [key]: !reminders[key] };
    setReminders(updated);
    setSaving(true);
    try {
      const { data } = await api.put('/profile/reminders', { reminders: updated });
      updateUser(data.user);
      setSuccess('Reminders updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch { setReminders(reminders); }
    finally { setSaving(false); }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeToPremiun();
      setSuccess('🎉 Welcome to Premium!');
      setTimeout(() => setSuccess(''), 3000);
    } catch { } finally { setUpgrading(false); }
  };

  const themeOptions = [
    { value: 'light',  label: '☀️ Light',  desc: 'Always light' },
    { value: 'dark',   label: '🌙 Dark',   desc: 'Always dark' },
    { value: 'system', label: '💻 System', desc: 'Follow device' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-fadeIn">
        <h1 className="section-title">Settings</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">Manage your account, appearance, and subscription</p>
      </div>

      {success && (
        <div className="p-3 bg-sage-50 dark:bg-sage-900/30 border border-sage-300 dark:border-sage-700 rounded-xl text-sage-700 dark:text-sage-300 text-sm text-center animate-fadeIn">
          {success}
        </div>
      )}

      {/* Account info */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Account</h2>
        <div className="space-y-3">
          {[
            { label: 'Name',         value: user?.name },
            { label: 'Email',        value: user?.email },
            { label: 'Member since', value: new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-sage-50 dark:border-gray-800 last:border-0">
              <span className="text-sm text-sage-600 dark:text-gray-400">{row.label}</span>
              <span className="text-sm font-medium text-sage-900 dark:text-white">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-sage-600 dark:text-gray-400">Plan</span>
            <span className={user?.isPremium ? 'badge-premium' : 'badge-free'}>
              {user?.isPremium ? '✨ Premium' : '🌱 Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Appearance / Dark mode */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">🎨 Appearance</h2>
        <p className="text-sm text-sage-500 dark:text-gray-400 mb-3">Currently: <strong className="text-sage-700 dark:text-gray-200">{effectiveTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode</strong></p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                theme === opt.value
                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 ring-1 ring-sage-400'
                  : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
              }`}>
              <p className="text-lg mb-1">{opt.label.split(' ')[0]}</p>
              <p className="text-xs font-medium text-sage-800 dark:text-gray-200">{opt.label.split(' ')[1]}</p>
              <p className="text-xs text-sage-400 dark:text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Premium upgrade */}
      {!user?.isPremium && (
        <div className="card bg-gradient-to-br from-amber-50 to-sage-50 dark:from-amber-900/20 dark:to-sage-900/20 border-amber-200 dark:border-amber-800 animate-fadeIn">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">✨</span>
            <div>
              <h2 className="font-display text-lg font-semibold text-sage-900 dark:text-white">Upgrade to Premium</h2>
              <p className="text-sm text-sage-600 dark:text-gray-400 mt-0.5">Unlock the full heAlthy experience</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {[
              '🥗 Personalized 7-day meal plans',
              '💬 AI Nutrition Coach chat',
              '🛒 Auto grocery list generation',
              '📊 Advanced macro & progress analytics',
              '🌍 Budget-friendly & region-specific meals',
              '🔕 No advertisements',
            ].map((f) => (
              <li key={f} className="text-sm text-sage-700 dark:text-gray-300 flex items-center gap-2">
                <span className="text-sage-400">✓</span>{f}
              </li>
            ))}
          </ul>
          <button onClick={handleUpgrade} disabled={upgrading}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-all">
            {upgrading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Upgrading...</> : '✨ Upgrade to Premium (Demo — Free)'}
          </button>
          <p className="text-xs text-sage-400 dark:text-gray-500 text-center mt-2">Demo only — no payment required</p>
        </div>
      )}

      {/* Reminders */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-3">🔔 Reminders</h2>
        <Toggle checked={reminders.waterReminder}   onChange={() => handleReminderToggle('waterReminder')}   label="💧 Water Reminder"   desc="Stay hydrated throughout the day" />
        <Toggle checked={reminders.mealReminders}   onChange={() => handleReminderToggle('mealReminders')}   label="🍽️ Meal Reminders"   desc="Never miss a scheduled meal" />
        <Toggle checked={reminders.workoutReminders} onChange={() => handleReminderToggle('workoutReminders')} label="🏃 Workout Reminders" desc="Log your workouts on time" />
        {saving && <p className="text-xs text-sage-400 dark:text-gray-500 mt-2 text-center">Saving...</p>}
      </div>

      {/* Danger zone */}
      <div className="card border-red-100 dark:border-red-900 animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-red-600 dark:text-red-400 mb-3">Account Actions</h2>
        <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-colors">
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
