import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  ChartNoAxesColumn,
  Clock3,
  Dumbbell,
  Globe,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  ShieldOff,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
  Droplets,
} from '../components/OpenMojiIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

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

// Storage key for reminder schedules
const REMINDER_STORAGE_KEY = 'healthy_reminder_schedules';
const PREMIUM_CHECKOUT_STORAGE_PREFIX = 'healthy_premium_checkout_';

const getPremiumCheckoutStorageKey = (userId) => `${PREMIUM_CHECKOUT_STORAGE_PREFIX}${userId}`;

const stripPremiumCheckoutParams = () => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete('premiumCheckout');
  url.searchParams.delete('checkout_session_id');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const defaultSchedules = {
  waterReminder:    { time: '08:00', label: 'Water Reminder',   intervalHours: 2,  startTime: '08:00', endTime: '22:00' },
  mealReminders:    { time: '12:00', label: 'Meal Reminder',    intervalHours: 0,  startTime: '12:00', endTime: '12:00' },
  workoutReminders: { time: '17:00', label: 'Workout Reminder', intervalHours: 0,  startTime: '17:00', endTime: '17:00' },
};

export default function Settings({ embedded = false }) {
  const { user, updateUser, startPremiumCheckout, confirmPremiumCheckout, logout } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [reminders, setReminders] = useState(user?.reminders || {
    waterReminder: false, mealReminders: false, workoutReminders: false,
  });
  const [schedules, setSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY)) || defaultSchedules; }
    catch { return defaultSchedules; }
  });
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [premiumCheckoutSessionId, setPremiumCheckoutSessionId] = useState('');
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const timerRefs = useRef({});
  const premiumCheckoutHandledRef = useRef(false);

  // Request notification permission
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  // Schedule a browser notification — supports repeating interval for water
  const scheduleNotification = (key, timeStr, label) => {
    // Clear existing timers
    if (timerRefs.current[key]) clearTimeout(timerRefs.current[key]);
    if (timerRefs.current[key + '_interval']) clearInterval(timerRefs.current[key + '_interval']);
    if (notifPermission !== 'granted') return;

    const schedule = schedules[key] || defaultSchedules[key];
    const intervalHours = schedule?.intervalHours || 0;

    if (intervalHours > 0) {
      // Repeating reminder (e.g. water every 2 hours between start and end time)
      const fireIfInRange = () => {
        const now = new Date();
        const [startH] = (schedule.startTime || timeStr).split(':').map(Number);
        const [endH]   = (schedule.endTime   || '22:00').split(':').map(Number);
        const hour = now.getHours();
        if (hour >= startH && hour < endH) {
          new Notification('heAlthy Reminder', {
            body: `${label}. Do not forget to drink water.`,
            icon: '/favicon.ico',
          });
        }
      };
      // Fire first time at start time
      const [startH, startM] = (schedule.startTime || timeStr).split(':').map(Number);
      const now = new Date();
      const firstFire = new Date();
      firstFire.setHours(startH, startM, 0, 0);
      if (firstFire <= now) firstFire.setDate(firstFire.getDate() + 1);
      timerRefs.current[key] = setTimeout(() => {
        fireIfInRange();
        // Then repeat every intervalHours
        timerRefs.current[key + '_interval'] = setInterval(fireIfInRange, intervalHours * 60 * 60 * 1000);
      }, firstFire - now);
    } else {
      // Single daily reminder
      const [hours, mins] = timeStr.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hours, mins, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const delay = target - now;
      timerRefs.current[key] = setTimeout(() => {
        new Notification('heAlthy Reminder', {
          body: label,
          icon: '/favicon.ico',
        });
        scheduleNotification(key, timeStr, label);
      }, delay);
    }
  };

  // Set up all active reminders on mount and when toggles change
  useEffect(() => {
    if (notifPermission !== 'granted') return;
    Object.entries(reminders).forEach(([key, enabled]) => {
      if (enabled && schedules[key]) {
        scheduleNotification(key, schedules[key].time, schedules[key].label);
      } else {
        if (timerRefs.current[key]) clearTimeout(timerRefs.current[key]);
      }
    });
    return () => Object.values(timerRefs.current).forEach(clearTimeout);
  }, [reminders, schedules, notifPermission]); // eslint-disable-line

  useEffect(() => {
    if (!user?._id) return;
    const storedCheckoutSessionId = localStorage.getItem(getPremiumCheckoutStorageKey(user._id)) || '';
    setPremiumCheckoutSessionId(storedCheckoutSessionId);

    if (!storedCheckoutSessionId || user?.isPremium) {
      premiumCheckoutHandledRef.current = false;
      if (user?.isPremium) {
        localStorage.removeItem(getPremiumCheckoutStorageKey(user._id));
      }
      return;
    }

    const checkoutStatus = new URLSearchParams(window.location.search).get('premiumCheckout');
    if (checkoutStatus === 'success' && !premiumCheckoutHandledRef.current) {
      premiumCheckoutHandledRef.current = true;
      setPaymentError('');
      setUpgrading(true);
      confirmPremiumCheckout(storedCheckoutSessionId)
        .then((data) => {
          if (data?.verified && data?.user?.isPremium) {
            localStorage.removeItem(getPremiumCheckoutStorageKey(user._id));
            setPremiumCheckoutSessionId('');
            setSuccess('Payment confirmed. Welcome to Premium!');
            setTimeout(() => setSuccess(''), 3000);
            stripPremiumCheckoutParams();
          } else {
            setPaymentError(data?.message || 'Payment is still processing. Please check again in a moment.');
          }
        })
        .catch((err) => {
          setPaymentError(err.response?.data?.error || err.message || 'Unable to verify premium payment.');
        })
        .finally(() => setUpgrading(false));
      return;
    }

    if (checkoutStatus === 'cancelled') {
      premiumCheckoutHandledRef.current = true;
      setPaymentError('Premium checkout was cancelled. You can try again anytime.');
      stripPremiumCheckoutParams();
    }
  }, [user?._id, user?.isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReminderToggle = async (key) => {
    const updated = { ...reminders, [key]: !reminders[key] };
    setReminders(updated);
    setSaving(true);
    try {
      const { data } = await api.put('/profile/reminders', { reminders: updated });
      updateUser(data.user);
      if (updated[key] && notifPermission === 'granted') {
        setSuccess(`${defaultSchedules[key].label} set for ${schedules[key].time}`);
      } else {
        setSuccess('Reminders updated!');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch { setReminders(reminders); }
    finally { setSaving(false); }
  };

  const handleTimeChange = (key, newTime) => {
    const updated = { ...schedules, [key]: { ...schedules[key], time: newTime } };
    setSchedules(updated);
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(updated));
    if (reminders[key] && notifPermission === 'granted') {
      scheduleNotification(key, newTime, updated[key].label);
      setSuccess(`${updated[key].label} updated to ${newTime}`);
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setPaymentError('');
    try {
      if (user?.isPremium) {
        setSuccess('You already have Premium access.');
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      if (premiumCheckoutSessionId) {
        const result = await confirmPremiumCheckout(premiumCheckoutSessionId);
        if (result?.verified && result?.user?.isPremium) {
          localStorage.removeItem(getPremiumCheckoutStorageKey(user._id));
          setPremiumCheckoutSessionId('');
          setSuccess('Payment confirmed. Welcome to Premium!');
          setTimeout(() => setSuccess(''), 3000);
          stripPremiumCheckoutParams();
        } else {
          setPaymentError(result?.message || 'Payment is still processing. Please try again in a moment.');
        }
        return;
      }

      const checkout = await startPremiumCheckout();
      if (!checkout?.checkoutSessionId || !checkout?.checkoutUrl) {
        throw new Error('PayMongo did not return a checkout URL.');
      }

      if (user?._id) {
        localStorage.setItem(getPremiumCheckoutStorageKey(user._id), checkout.checkoutSessionId);
      }
      setPremiumCheckoutSessionId(checkout.checkoutSessionId);
      window.location.assign(checkout.checkoutUrl);
    } catch (err) {
      setPaymentError(err.response?.data?.error || err.message || 'Unable to start premium checkout.');
    } finally {
      setUpgrading(false);
    }
  };

  const themeOptions = [
    { value: 'light',  label: 'Light',  desc: 'Always light', icon: Sun },
    { value: 'dark',   label: 'Dark',   desc: 'Always dark', icon: Moon },
    { value: 'system', label: 'System', desc: 'Follow device', icon: Monitor },
  ];

  const reminderItems = [
    { key: 'waterReminder',    label: 'Water Reminder',   desc: 'Reminds you every 2 hours from 8AM to 10PM to drink water', icon: Droplets },
    { key: 'mealReminders',    label: 'Meal Reminder',    desc: 'Fires once daily at your set time', icon: UtensilsCrossed },
    { key: 'workoutReminders', label: 'Workout Reminder', desc: 'Fires once daily at your set time', icon: Dumbbell },
  ];

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-2xl mx-auto space-y-6'}>
      {!embedded && (
        <div className="animate-fadeIn">
          <h1 className="section-title">Settings</h1>
          <p className="text-sage-600 dark:text-gray-400 mt-1">Manage your account, appearance, and subscription</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-sage-50 dark:bg-sage-900/30 border border-sage-300 dark:border-sage-700 rounded-xl text-sage-700 dark:text-sage-300 text-sm text-center animate-fadeIn">
          {success}
        </div>
      )}

      {paymentError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm text-center animate-fadeIn">
          {paymentError}
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
              {user?.isPremium ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4 inline-flex items-center gap-2">
          <Palette className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          Appearance
        </h2>
        <p className="text-sm text-sage-500 dark:text-gray-400 mb-3">Currently: <strong className="text-sage-700 dark:text-gray-200">{effectiveTheme === 'dark' ? 'Dark' : 'Light'} mode</strong></p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                theme === opt.value
                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 ring-1 ring-sage-400'
                  : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
              }`}>
              <opt.icon className="h-5 w-5 mx-auto mb-1 text-sage-600 dark:text-sage-300" strokeWidth={1.9} aria-hidden="true" />
              <p className="text-xs font-medium text-sage-800 dark:text-gray-200">{opt.label}</p>
              <p className="text-xs text-sage-400 dark:text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Premium upgrade */}
      {!user?.isPremium && (
        <div className="card bg-gradient-to-br from-amber-50 to-sage-50 dark:from-amber-900/20 dark:to-sage-900/20 border-amber-200 dark:border-amber-800 animate-fadeIn">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="h-7 w-7 text-amber-500 mt-0.5" strokeWidth={1.9} aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-sage-900 dark:text-white">Upgrade to Premium</h2>
              <p className="text-sm text-sage-600 dark:text-gray-400 mt-0.5">Secure QRPH checkout through PayMongo</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {[
              { text: 'Personalized 7-day meal plans', icon: UtensilsCrossed },
              { text: 'AI Nutrition Coach chat', icon: MessageCircle },
              { text: 'Auto grocery list generation', icon: ShoppingCart },
              { text: 'Advanced macro and progress analytics', icon: ChartNoAxesColumn },
              { text: 'Region-specific meals', icon: Globe },
              { text: 'No advertisements', icon: ShieldOff },
            ].map((f) => (
              <li key={f.text} className="text-sm text-sage-700 dark:text-gray-300 flex items-center gap-2">
                <f.icon className="h-4 w-4 text-sage-400" strokeWidth={2} aria-hidden="true" />{f.text}
              </li>
            ))}
          </ul>
          <button onClick={handleUpgrade} disabled={upgrading}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-all">
            {upgrading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking payment...</> : premiumCheckoutSessionId ? 'Check QRPH payment status' : 'Pay ₱199 via QRPH'}
          </button>
          <p className="text-xs text-sage-400 dark:text-gray-500 text-center mt-2">You will be redirected to PayMongo’s hosted checkout. Premium is unlocked only after the payment is verified.</p>
          {premiumCheckoutSessionId && (
            <p className="text-xs text-sage-500 dark:text-gray-400 text-center mt-1">
              Your last checkout session is saved, so you can verify the QRPH payment again if needed.
            </p>
          )}
        </div>
      )}

      {/* Reminders */}
      <div className="card animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white inline-flex items-center gap-2">
            <Bell className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            Reminders
          </h2>
          {notifPermission !== 'granted' && (
            <button onClick={requestPermission}
              className="text-xs bg-sage-600 text-white px-3 py-1.5 rounded-lg hover:bg-sage-700 transition-colors">
              Enable Notifications
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Notifications on
            </span>
          )}
          {notifPermission === 'denied' && (
            <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">Notifications blocked</span>
          )}
        </div>

        <p className="text-xs text-sage-400 dark:text-gray-500 mb-4">
          Set the time for each reminder. Notifications will fire daily at the set time while the app is open.
        </p>

        <div className="space-y-1">
          {reminderItems.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="border-b border-sage-50 dark:border-gray-800 last:border-0 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-sage-800 dark:text-gray-200 inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {label}
                  </p>
                  <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Time picker — only shown when enabled */}
                  {reminders[key] && (
                    <input
                      type="time"
                      value={schedules[key]?.time || '08:00'}
                      onChange={(e) => handleTimeChange(key, e.target.value)}
                      className="text-xs border border-sage-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-sage-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-sage-400"
                    />
                  )}
                  <button onClick={() => handleReminderToggle(key)}
                    className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center flex-shrink-0 ${reminders[key] ? 'bg-sage-600 justify-end' : 'bg-sage-200 dark:bg-gray-700 justify-start'}`}>
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 block" />
                  </button>
                </div>
              </div>
              {reminders[key] && schedules[key] && (
                <p className="text-xs text-sage-400 dark:text-gray-500 mt-1">
                  {key === 'waterReminder'
                    ? <><Clock3 className="h-3.5 w-3.5 inline-block mr-1" strokeWidth={2} aria-hidden="true" />Every 2 hours from <strong className="text-sage-600 dark:text-sage-400">8:00 AM</strong> to <strong className="text-sage-600 dark:text-sage-400">10:00 PM</strong></>
                    : <><Clock3 className="h-3.5 w-3.5 inline-block mr-1" strokeWidth={2} aria-hidden="true" />Fires daily at <strong className="text-sage-600 dark:text-sage-400">{schedules[key].time}</strong></>
                  }
                  {notifPermission !== 'granted' && ' — Enable notifications above to receive alerts'}
                </p>
              )}
            </div>
          ))}
        </div>
        {saving && <p className="text-xs text-sage-400 dark:text-gray-500 mt-2 text-center">Saving...</p>}
      </div>

      {/* Danger zone */}
      <div className="card border-red-100 dark:border-red-900 animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-red-600 dark:text-red-400 mb-3">Account Actions</h2>
        <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-colors">
          <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
