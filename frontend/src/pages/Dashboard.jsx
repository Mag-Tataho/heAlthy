import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateBMR, calculateTDEE, calculateDailyCalories, calculateBMI, getBMICategory, formatGoal, getMacroTargets, formatActivityLevel } from '../utils/nutrition';
import api from '../utils/api';

const TIPS = {
  lose_weight: [
    '🥦 Fill half your plate with non-starchy vegetables at every meal.',
    '💧 Drink a glass of water 20 minutes before eating to reduce appetite.',
    '🍽️ Use smaller plates — it tricks your brain into feeling more satisfied.',
    '⏰ Eat slowly and chew well — it takes 20 minutes to feel full.',
    '🚶 A 20-minute walk after meals helps burn calories and aids digestion.',
    '📝 Track what you eat — awareness alone reduces intake by up to 20%.',
    '🌙 Avoid eating 2–3 hours before bedtime for better fat burning.',
    '🍳 Eat a protein-rich breakfast to reduce hunger throughout the day.',
  ],
  gain_muscle: [
    '🥩 Aim for 1.6–2.2g of protein per kg of bodyweight daily.',
    '🏋️ Eat within 30–60 minutes post-workout for optimal muscle recovery.',
    '🍌 Include complex carbs around workouts for energy and glycogen refill.',
    '😴 Prioritize 7–9 hours of sleep — muscles grow while you rest.',
    '🥚 Eggs are one of the best muscle-building foods — eat them daily.',
    '📈 Progressive overload matters more than any supplement.',
    '🫘 Legumes are cheap, filling, and packed with plant protein.',
    '💪 Consistency beats intensity — show up every day.',
  ],
  maintain: [
    '🌈 Eat a variety of colorful vegetables every day for micronutrients.',
    '🫘 Include legumes 3× per week — great source of fiber and protein.',
    '🐟 Aim for 2 portions of fatty fish per week for omega-3s.',
    '🚶 Move for at least 30 minutes every day — walking counts!',
    '🍬 Limit added sugars to less than 25g (6 tsp) per day.',
    '🥑 Replace saturated fats with healthy fats like avocado and olive oil.',
    '🍱 Meal prep on Sundays to make healthy eating easy all week.',
    '📊 Weigh yourself weekly, not daily — daily fluctuations are normal.',
  ],
  improve_health: [
    '🥗 Try the Mediterranean diet — proven to reduce disease risk.',
    '🫐 Eat berries 3× a week — powerful antioxidants for brain health.',
    '🧘 Manage stress — cortisol affects digestion and weight gain.',
    '🌿 Add turmeric and ginger to meals — natural anti-inflammatories.',
    '☕ Limit coffee to 2–3 cups a day for optimal health benefits.',
    '🧄 Eat garlic regularly — it boosts immunity and heart health.',
    '💊 Consider Vitamin D if you don\'t get much sunlight.',
    '🥦 Eat cruciferous vegetables (broccoli, cauliflower) 3× per week.',
  ],
};

const StatCard = ({ icon, label, value, unit, sub, color = 'text-sage-700 dark:text-sage-300' }) => (
  <div className="card animate-fadeIn">
    <span className="text-2xl block mb-2">{icon}</span>
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
  }, []);

  const getAITip = async () => {
    setLoadingTip(true);
    try {
      const { data } = await api.post('/ai/chat', {
        messages: [{
          role: 'user',
          content: `Give me one specific, actionable nutrition tip for today. My goal is ${p.goal?.replace(/_/g, ' ') || 'improve health'}${p.region ? `, I am from ${p.region}` : ''}${p.dietaryRestrictions?.length ? `, I am ${p.dietaryRestrictions.join(', ')}` : ''}. Keep it under 2 sentences, make it practical and motivating. Start directly with the tip, no intro.`
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

  // Budget display
  const budgetDisplay = p.budgetAmount
    ? `${p.currency === 'USD' ? '$' : '₱'}${p.budgetAmount}/${p.budgetPeriod}`
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fadeIn flex items-start justify-between">
        <div>
          <h1 className="section-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sage-600 dark:text-gray-400 mt-1">
            {hasProfile
              ? `${formatGoal(p.goal)} · ${formatActivityLevel(p.activityLevel)}${budgetDisplay ? ` · Budget: ${budgetDisplay}` : ''}`
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
          <Link to="/profile" className="btn-primary text-sm whitespace-nowrap">Set Up Profile →</Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard icon="🔥" label="Daily Calorie Target" value={dailyCals} unit="kcal" sub={p.goal ? formatGoal(p.goal) : null} />
        <StatCard icon="⚖️" label="Current Weight" value={latestWeight} unit="kg" sub={p.targetWeight ? `Target: ${p.targetWeight} kg` : null} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon="📏" label="BMI" value={bmi} sub={bmiCat?.label} color={bmiCat?.color} />
        <StatCard icon="⚡" label="Maintenance Calories" value={tdee} unit="kcal" sub="TDEE" />
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
            <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide">
              {tipSource === 'ai' ? '🤖 AI Tip' : '💡 Daily Tip'}
            </p>
            {user?.isPremium && (
              <button onClick={getAITip} disabled={loadingTip}
                className="text-xs text-sage-500 dark:text-gray-400 hover:text-sage-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                {loadingTip ? (
                  <div className="w-3 h-3 border border-sage-400 border-t-transparent rounded-full animate-spin" />
                ) : '✨ AI tip'}
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
              {user?.isPremium && ' · Click ✨ for personalized AI tip'}
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-gray-200 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
          {[
            { to: '/meal-plans', icon: '🥗', label: 'Generate Meal Plan', from: 'from-sage-500', to2: 'to-sage-600' },
            { to: '/progress',   icon: '📊', label: "Log Today's Progress", from: 'from-blue-500', to2: 'to-blue-600' },
            { to: '/food-search',icon: '🔍', label: 'Search Foods',         from: 'from-amber-400', to2: 'to-amber-500' },
            {
              to: user?.isPremium ? '/chat' : '/settings',
              icon: '💬',
              label: user?.isPremium ? 'Ask AI Coach' : 'Upgrade for AI',
              from: 'from-purple-500', to2: 'to-purple-600'
            },
          ].map((action) => (
            <Link key={action.to + action.label}
              to={action.to}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${action.from} ${action.to2} text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 text-center min-h-[100px]`}>
              <span className="text-3xl mb-2">{action.icon}</span>
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent progress */}
      {recentProgress.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white">Recent Activity</h2>
            <Link to="/progress" className="text-sm text-sage-600 dark:text-sage-400 hover:underline">View all →</Link>
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
                  {entry.water    && <span className="text-blue-600 dark:text-blue-400"><strong>{entry.water}</strong> 💧</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad placeholder */}
      {!user?.isPremium && (
        <div className="h-16 bg-sage-100 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-sage-200 dark:border-gray-700 flex items-center justify-center text-sage-400 dark:text-gray-500 text-sm">
          Advertisement ·{' '}
          <Link to="/settings" className="ml-1 text-sage-600 dark:text-sage-400 hover:underline">Upgrade to remove ads</Link>
        </div>
      )}
    </div>
  );
}
