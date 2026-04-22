import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  ChartNoAxesColumn,
  Droplets,
  Flame,
  Lightbulb,
  MessageCircle,
  Ruler,
  Scale,
  Search,
  Sparkles,
  UtensilsCrossed,
} from '../components/OpenMojiIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateBMR, calculateTDEE, calculateDailyCalories, calculateBMI, getBMICategory, formatGoal, getMacroTargets, formatActivityLevel } from '../utils/nutrition';
import api from '../utils/api';

const TIPS = {
  lose_weight: [
    'Fill half your plate with non-starchy vegetables at every meal.',
    'Drink a glass of water 20 minutes before eating to reduce appetite.',
    'Use smaller plates; it helps your brain feel more satisfied.',
    'Eat slowly and chew well; it takes about 20 minutes to feel full.',
    'A 20-minute walk after meals helps burn calories and aids digestion.',
    'Track what you eat; awareness alone can reduce intake.',
    'Avoid eating 2 to 3 hours before bedtime for better fat burning.',
    'Eat a protein-rich breakfast to reduce hunger throughout the day.',
  ],
  gain_muscle: [
    'Aim for 1.6 to 2.2g of protein per kg of bodyweight daily.',
    'Eat within 30 to 60 minutes after workouts for better recovery.',
    'Include complex carbs around workouts for energy and glycogen refill.',
    'Prioritize 7 to 9 hours of sleep; muscles grow while you rest.',
    'Eggs are one of the best muscle-building foods to include regularly.',
    'Progressive overload matters more than supplements.',
    'Legumes are affordable, filling, and packed with plant protein.',
    'Consistency beats intensity; show up every day.',
  ],
  maintain: [
    'Eat a variety of colorful vegetables every day for micronutrients.',
    'Include legumes three times per week for fiber and protein.',
    'Aim for two portions of fatty fish per week for omega-3s.',
    'Move for at least 30 minutes every day; walking counts.',
    'Limit added sugars to less than 25g (about 6 tsp) per day.',
    'Replace saturated fats with healthier fats like avocado and olive oil.',
    'Meal prep weekly to make healthy eating easier every day.',
    'Weigh yourself weekly, not daily; fluctuations are normal.',
  ],
  improve_health: [
    'Try the Mediterranean diet; it is linked to reduced disease risk.',
    'Eat berries several times a week for antioxidant support.',
    'Manage stress because cortisol affects digestion and weight.',
    'Add turmeric and ginger to meals for anti-inflammatory support.',
    'Limit coffee to two to three cups per day.',
    'Eat garlic regularly to support immunity and heart health.',
    'Consider vitamin D if you do not get much sunlight.',
    'Eat cruciferous vegetables like broccoli and cauliflower regularly.',
  ],
};

const StatCard = ({ icon: Icon, label, value, unit, sub, color = 'text-sage-700 dark:text-sage-300' }) => (
  <div className="card animate-fadeIn">
    <Icon className="h-6 w-6 md:h-[1.875rem] md:w-[1.875rem] text-sage-600 dark:text-sage-300 mb-2" strokeWidth={1.9} aria-hidden="true" />
    <p className="text-3xl font-display font-semibold text-sage-900 dark:text-white">
      {value ?? '—'}{' '}
      <span className="text-lg font-body font-normal text-sage-400 dark:text-gray-500">{unit}</span>
    </p>
    <p className="text-sm text-sage-600 dark:text-gray-400 mt-1">{label}</p>
    {sub && <p className={`text-xs mt-1 font-medium ${color}`}>{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { effectiveTheme } = useTheme();
  const [recentProgress, setRecentProgress] = useState([]);
  const [aiTip, setAiTip] = useState('');
  const [loadingTip, setLoadingTip] = useState(false);
  const [tipSource, setTipSource] = useState('static');

  const p = user?.profile || {};
  const bmr = calculateBMR(p.weight, p.height, p.age, p.gender);
  const tdee = calculateTDEE(bmr, p.activityLevel);
  const dailyCals = calculateDailyCalories(tdee, p.goal);
  const bmi = calculateBMI(p.weight, p.height);
  const bmiCat = getBMICategory(bmi);
  const macros = getMacroTargets(dailyCals, p.goal);

  // Static tip based on day of week
  const staticTips = TIPS[p.goal] || TIPS.maintain;
  const staticTip = staticTips[new Date().getDay() % staticTips.length];

  useEffect(() => {
    api.get('/progress?limit=7')
      .then(({ data }) => setRecentProgress(data.entries || []))
      .catch(() => {});
    // Auto-load AI tip on mount
    getAITip();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getAITip = async () => {
    setLoadingTip(true);
    try {
      const { data } = await api.post('/ai/chat', {
        messages: [{
          role: 'user',
          content: `Give me one specific, actionable nutrition tip for today. My goal is ${p.goal?.replace(/_/g, ' ') || 'improve health'}${p.region ? `, I am from ${p.region}` : ''}${p.dietaryRestrictions?.length ? `, my dietary restrictions are: ${p.dietaryRestrictions.join(', ')}` : ''}${p.allergies?.length ? `, I am ALLERGIC to: ${p.allergies.join(', ')} — NEVER suggest these foods` : ''}. Keep it under 2 sentences, make it practical and motivating. IMPORTANT: Do not suggest any food the user is allergic to or that violates their dietary restrictions. Start directly with the tip, no intro.`
        }]
      });
      setAiTip(data.reply);
      setTipSource('ai');
    } catch {
      setAiTip('');
    } finally {
      setLoadingTip(false);
    }
  };

  const hasProfile = p.weight && p.height && p.age;
  const latestWeight = recentProgress.find((e) => e.weight)?.weight || p.weight;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fadeIn flex items-start justify-between">
        <div>
          <h1 className="section-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sage-600 dark:text-gray-400 mt-1">
            {hasProfile
              ? `${formatGoal(p.goal)} · ${formatActivityLevel(p.activityLevel)}`
              : 'Complete your profile to get personalized insights'}
          </p>
        </div>
      </div>

      {/* Profile incomplete banner */}
      {!hasProfile && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Complete your profile</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">Add your details to unlock personalized recommendations</p>
          </div>
          <Link to="/profile" className="btn-primary text-sm whitespace-nowrap inline-flex items-center gap-1">
            Set Up Profile
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard icon={Flame} label="Daily Calorie Target" value={dailyCals} unit="kcal" sub={p.goal ? formatGoal(p.goal) : null} />
        <StatCard icon={Scale} label="Current Weight" value={latestWeight} unit="kg" sub={p.targetWeight ? `Target: ${p.targetWeight} kg` : null} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={Ruler} label="BMI" value={bmi} sub={bmiCat?.label} color={bmiCat?.color} />
        <StatCard icon={Activity} label="Maintenance Calories" value={tdee} unit="kcal" sub="TDEE" />
      </div>

      {/* Macros + daily tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Macro targets */}
        {macros && (
          <div className="card lg:col-span-2 animate-fadeIn">
            <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-4">Daily Macro Targets</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Protein', value: macros.protein, color: 'bg-blue-400', textColor: 'text-blue-600 dark:text-blue-400' },
                { label: 'Carbs',   value: macros.carbs,   color: 'bg-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
                { label: 'Fat',     value: macros.fat,     color: 'bg-sage-500',  textColor: 'text-sage-600 dark:text-sage-400' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div className={`text-2xl font-display font-semibold ${m.textColor}`}>
                    {m.value}<span className="text-sm font-body font-normal text-sage-400 dark:text-gray-500 ml-1">g</span>
                  </div>
                  <p className="text-xs text-sage-600 dark:text-gray-400 my-1">{m.label}</p>
                  <div className="h-1.5 bg-sage-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Tip Card */}
        <div className="card bg-gradient-to-br from-sage-50 to-white dark:from-gray-800 dark:to-gray-900 border-sage-200 dark:border-gray-700 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide inline-flex items-center gap-1.5">
              {tipSource === 'ai'
                ? <Bot className="h-3.5 w-3.5 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
                : <Lightbulb className="h-3.5 w-3.5 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2} aria-hidden="true" />}
              {tipSource === 'ai' ? 'AI Tip' : 'Daily Tip'}
            </p>
            {user?.isPremium && (
              <button onClick={getAITip} disabled={loadingTip}
                className="text-xs text-sage-500 dark:text-gray-400 hover:text-sage-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                {loadingTip ? (
                  <div className="w-3 h-3 border border-sage-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
                    AI tip
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-sage-800 dark:text-gray-200 text-sm leading-relaxed">
            {loadingTip ? (
              <span className="text-sage-400 dark:text-gray-500 loading-pulse">Generating your tip...</span>
            ) : aiTip || staticTip}
          </p>
          {tipSource === 'static' && (
            <p className="text-xs text-sage-400 dark:text-gray-500 mt-2">
              Tip {(new Date().getDay() % staticTips.length) + 1} of {staticTips.length}
              {user?.isPremium && ' · Click AI tip for personalized guidance'}
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-gray-200 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
          {[
            { to: '/meal-plans', icon: UtensilsCrossed,   label: 'Generate Meal Plan', from: 'from-sage-500', to2: 'to-sage-600' },
            { to: '/progress',   icon: ChartNoAxesColumn, label: "Log Today's Progress", from: 'from-blue-500', to2: 'to-blue-600' },
            { to: '/food-search',icon: Search,            label: 'Search Foods',         from: 'from-amber-400', to2: 'to-amber-500' },
            {
              to: user?.isPremium ? '/chat' : '/profile',
              icon: MessageCircle,
              label: user?.isPremium ? 'Ask AI Coach' : 'Upgrade for AI',
              from: 'from-purple-500', to2: 'to-purple-600'
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to + action.label}
                to={action.to}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${action.from} ${action.to2} text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 text-center min-h-[100px]`}
              >
                <Icon className="h-7 w-7 md:h-[2.1875rem] md:w-[2.1875rem] mb-2" strokeWidth={1.9} aria-hidden="true" />
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent progress */}
      {recentProgress.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white">Recent Activity</h2>
            <Link to="/progress" className="text-sm text-sage-600 dark:text-sage-400 hover:underline inline-flex items-center gap-1">
              View all
              <ArrowRight className="h-3.5 w-3.5 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentProgress.slice(0, 5).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between py-2 border-b border-sage-50 dark:border-gray-800 last:border-0">
                <span className="text-sm text-sage-600 dark:text-gray-400">
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <div className="flex gap-4 text-sm">
                  {entry.weight   && <span className="text-sage-700 dark:text-gray-300"><strong>{entry.weight}</strong> kg</span>}
                  {entry.calories && <span className="text-amber-600 dark:text-amber-400"><strong>{entry.calories}</strong> kcal</span>}
                  {entry.water    && (
                    <span className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                      <strong>{entry.water}</strong>
                      <Droplets className="h-3.5 w-3.5 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad placeholder */}
      {!user?.isPremium && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 via-white to-sage-50 dark:from-amber-950/35 dark:via-gray-900 dark:to-gray-800 p-4 shadow-sm animate-fadeIn">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-sage-500 text-white shadow-lg">
              <Sparkles className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-sage-400 dark:text-gray-500">Sponsored</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-sage-900 dark:text-white">Ad space available for wellness partners</h3>
              <p className="mt-1 text-sm text-sage-600 dark:text-gray-400">Use this slot for seasonal campaigns, fitness brands, or healthy meal promos.</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <span className="inline-flex items-center rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/70">Ad slot</span>
              <Link to="/profile" className="inline-flex items-center gap-1 rounded-full bg-sage-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sage-800 dark:bg-white dark:text-sage-900 dark:hover:bg-sage-100">
                Upgrade to remove ads
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
