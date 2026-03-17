import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const today = new Date().toISOString().split('T')[0];

// ── Motivational quotes ──────────────────────────────────────
const QUOTES = [
  { text: "Every step forward is progress, no matter how small.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Consistency is more important than perfection.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Believe in yourself and all that you are.", author: "Christian D. Larson" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
];

const getDailyQuote = () => QUOTES[new Date().getDay() % QUOTES.length];

// ── Prediction helpers ───────────────────────────────────────
const predictWeightTrend = (entries, targetWeight) => {
  const weightEntries = entries.filter(e => e.weight).slice(0, 14);
  if (weightEntries.length < 2) return null;

  const latest = weightEntries[0].weight;
  const oldest = weightEntries[weightEntries.length - 1].weight;
  const days = weightEntries.length;
  const ratePerDay = (latest - oldest) / days; // kg per day (negative = losing)

  if (Math.abs(ratePerDay) < 0.001) return { trend: 'stable', rate: 0, latest };

  const trend = ratePerDay < 0 ? 'losing' : 'gaining';
  const ratePerWeek = Math.abs(ratePerDay * 7);

  let daysToGoal = null;
  let goalText = null;
  if (targetWeight && Math.abs(ratePerDay) > 0) {
    const diff = latest - targetWeight;
    if ((diff > 0 && ratePerDay < 0) || (diff < 0 && ratePerDay > 0)) {
      daysToGoal = Math.round(Math.abs(diff / ratePerDay));
      const goalDate = new Date();
      goalDate.setDate(goalDate.getDate() + daysToGoal);
      goalText = goalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  return { trend, rate: ratePerWeek.toFixed(2), latest, daysToGoal, goalText, ratePerDay };
};

const getStreakDays = (entries) => {
  if (!entries.length) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date); entryDate.setHours(0,0,0,0);
    const expected = new Date(today); expected.setDate(today.getDate() - i);
    if (entryDate.getTime() === expected.getTime()) streak++;
    else break;
  }
  return streak;
};

export default function Progress() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: today, weight: '', calories: '', water: '',
    protein: '', carbs: '', fat: '',
    workoutType: '', workoutDuration: '', workoutCalories: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeChart, setActiveChart] = useState('weight');
  const [deletingId, setDeletingId] = useState(null);

  const quote = getDailyQuote();
  const p = user?.profile || {};

  useEffect(() => { fetchProgress(); }, []);

  const fetchProgress = async () => {
    try {
      const { data } = await api.get('/progress?limit=30');
      setEntries(data.entries || []);
    } catch { setError('Failed to load progress data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        date: form.date,
        ...(form.weight   && { weight:   parseFloat(form.weight) }),
        ...(form.calories && { calories: parseInt(form.calories) }),
        ...(form.water    && { water:    parseFloat(form.water) }),
        ...(form.protein  && { protein:  parseFloat(form.protein) }),
        ...(form.carbs    && { carbs:    parseFloat(form.carbs) }),
        ...(form.fat      && { fat:      parseFloat(form.fat) }),
        ...(form.notes    && { notes:    form.notes }),
        ...(form.workoutType && {
          workout: {
            type: form.workoutType,
            duration:      form.workoutDuration  ? parseInt(form.workoutDuration)  : undefined,
            caloriesBurned: form.workoutCalories ? parseInt(form.workoutCalories)  : undefined,
          },
        }),
      };
      await api.post('/progress', payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchProgress();
      setForm(f => ({ ...f, weight:'', calories:'', water:'', protein:'', carbs:'', fat:'', workoutType:'', workoutDuration:'', workoutCalories:'', notes:'' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save progress');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/progress/${id}`);
      fetchProgress();
    } catch { setError('Failed to delete entry'); }
    finally { setDeletingId(null); }
  };

  const chartData = [...entries].reverse().map(e => ({
    date:     new Date(e.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }),
    weight:   e.weight,
    calories: e.calories,
    water:    e.water,
    protein:  e.protein,
    carbs:    e.carbs,
    fat:      e.fat,
  }));

  const chartConfigs = {
    weight:   { key:'weight',   color:'#508650', unit:'kg',      label:'Weight' },
    calories: { key:'calories', color:'#f59e0b', unit:'cal',     label:'Calories' },
    water:    { key:'water',    color:'#3b82f6', unit:'glasses', label:'Water' },
    fat:      { key:'fat',      color:'#10b981', unit:'g',       label:'Fat' },
  };

  const prediction = predictWeightTrend(entries, p.targetWeight);
  const streak = getStreakDays(entries);
  const latestEntry = entries[0];

  // Summary stats
  const avg = (key) => {
    const vals = entries.slice(0, 7).map(e => e[key]).filter(Boolean);
    return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length * 10) / 10 : null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="section-title">Progress Tracker</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">Log and visualize your health journey</p>
      </div>

      {/* Daily Quote */}
      <div className="card bg-gradient-to-br from-sage-50 to-white dark:from-gray-800 dark:to-gray-900 border-sage-200 animate-fadeIn">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="text-sm font-medium text-sage-800 dark:text-gray-200 italic">"{quote.text}"</p>
            <p className="text-xs text-sage-400 dark:text-gray-500 mt-1">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
        {/* Streak */}
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-sage-700 dark:text-white">{streak}</p>
          <p className="text-xs text-sage-500 dark:text-gray-400 mt-1">🔥 Day Streak</p>
        </div>
        {/* Avg calories */}
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{avg('calories') || '—'}</p>
          <p className="text-xs text-sage-500 dark:text-gray-400 mt-1">🍽️ Avg Calories (7d)</p>
        </div>
        {/* Latest weight */}
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-sage-700 dark:text-white">{latestEntry?.weight || '—'}</p>
          <p className="text-xs text-sage-500 dark:text-gray-400 mt-1">⚖️ Latest Weight (kg)</p>
        </div>
        {/* Avg water */}
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">{avg('water') || '—'}</p>
          <p className="text-xs text-sage-500 dark:text-gray-400 mt-1">💧 Avg Water (7d)</p>
        </div>
      </div>

      {/* Weight Prediction */}
      {prediction && (
        <div className={`card animate-fadeIn border-l-4 ${
          prediction.trend === 'losing' ? 'border-l-green-500' :
          prediction.trend === 'gaining' ? 'border-l-amber-500' : 'border-l-blue-400'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {prediction.trend === 'losing' ? '📉' : prediction.trend === 'gaining' ? '📈' : '➡️'}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-sage-800 dark:text-white text-sm mb-1">Weight Prediction</h3>
              <p className="text-sm text-sage-600 dark:text-gray-300">
                You are currently <strong className={prediction.trend === 'losing' ? 'text-green-600' : 'text-amber-600'}>
                  {prediction.trend === 'stable' ? 'maintaining weight' : `${prediction.trend} ~${prediction.rate} kg/week`}
                </strong>
                {prediction.trend !== 'stable' && ` based on your last ${entries.filter(e=>e.weight).slice(0,14).length} weigh-ins.`}
              </p>
              {prediction.goalText && p.targetWeight && (
                <p className="text-sm text-sage-500 dark:text-gray-400 mt-1">
                  🎯 At this rate, you'll reach your target of <strong>{p.targetWeight} kg</strong> around <strong className="text-sage-700 dark:text-sage-300">{prediction.goalText}</strong>
                  {prediction.daysToGoal && ` (~${prediction.daysToGoal} days)`}.
                </p>
              )}
              {!p.targetWeight && (
                <p className="text-xs text-sage-400 dark:text-gray-500 mt-1">
                  💡 Set a target weight in your Profile to see your goal prediction.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Form */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">📝 Log Today's Data</h2>
        <form onSubmit={handleSubmit}>
          {/* Body metrics */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-3">Body & Nutrition</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="input-field" max={today} />
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input type="number" step="0.1" value={form.weight}
                  onChange={e => setForm({...form, weight: e.target.value})}
                  className="input-field" placeholder="e.g. 75.5" />
              </div>
              <div>
                <label className="label">Calories eaten</label>
                <input type="number" value={form.calories}
                  onChange={e => setForm({...form, calories: e.target.value})}
                  className="input-field" placeholder="e.g. 1850" />
              </div>
              <div>
                <label className="label">Water (glasses)</label>
                <input type="number" step="0.5" value={form.water}
                  onChange={e => setForm({...form, water: e.target.value})}
                  className="input-field" placeholder="e.g. 8" />
              </div>
            </div>

            {/* Macros row */}
            <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-3">Macros (g)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">🔵 Protein (g)</label>
                <input type="number" step="0.1" value={form.protein}
                  onChange={e => setForm({...form, protein: e.target.value})}
                  className="input-field" placeholder="e.g. 120" />
              </div>
              <div>
                <label className="label">🟡 Carbs (g)</label>
                <input type="number" step="0.1" value={form.carbs}
                  onChange={e => setForm({...form, carbs: e.target.value})}
                  className="input-field" placeholder="e.g. 200" />
              </div>
              <div>
                <label className="label">🟢 Fat (g)</label>
                <input type="number" step="0.1" value={form.fat}
                  onChange={e => setForm({...form, fat: e.target.value})}
                  className="input-field" placeholder="e.g. 55" />
              </div>
            </div>
          </div>

          {/* Workout */}
          <div className="border-t border-sage-100 dark:border-gray-700 pt-4 mt-4 mb-4">
            <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-3">🏃 Workout (optional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Activity type</label>
                <input type="text" value={form.workoutType}
                  onChange={e => setForm({...form, workoutType: e.target.value})}
                  className="input-field" placeholder="e.g. Running" />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input type="number" value={form.workoutDuration}
                  onChange={e => setForm({...form, workoutDuration: e.target.value})}
                  className="input-field" placeholder="e.g. 45" />
              </div>
              <div>
                <label className="label">Calories burned</label>
                <input type="number" value={form.workoutCalories}
                  onChange={e => setForm({...form, workoutCalories: e.target.value})}
                  className="input-field" placeholder="e.g. 350" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="label">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="input-field resize-none" rows={2}
              placeholder="How are you feeling today? Any observations..." />
          </div>

          {success && (
            <div className="mb-3 p-3 bg-sage-50 dark:bg-gray-800 border border-sage-300 dark:border-gray-700 rounded-xl text-sage-700 dark:text-gray-300 text-sm text-center">
              ✅ Progress logged! Keep it up! 💪
            </div>
          )}
          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : '📊 Log Progress'}
          </button>
        </form>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white">Progress Charts</h2>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(chartConfigs).map(([key, cfg]) => (
                <button key={key} onClick={() => setActiveChart(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeChart === key ? 'bg-sage-600 text-white' : 'bg-sage-100 dark:bg-gray-700 text-sage-600 dark:text-gray-300 hover:bg-sage-200 dark:hover:bg-gray-600'
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4ede3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#74a072' }} />
              <YAxis tick={{ fontSize: 11, fill: '#74a072' }} />
              <Tooltip contentStyle={{ background:'white', border:'1px solid #c9dbc8', borderRadius:'12px', fontSize:12 }} />
              <Line type="monotone" dataKey={chartConfigs[activeChart].key}
                stroke={chartConfigs[activeChart].color} strokeWidth={2.5}
                dot={{ fill: chartConfigs[activeChart].color, r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-sage-400 dark:text-gray-500 mt-2">
            Showing last {chartData.length} entries · {chartConfigs[activeChart].unit}
          </p>
        </div>
      )}

      {/* Macro Bar Chart */}
      {chartData.length > 0 && (
        <div className="card animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Macro Overview (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4ede3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#74a072' }} />
              <YAxis tick={{ fontSize: 11, fill: '#74a072' }} />
              <Tooltip contentStyle={{ borderRadius:'12px', fontSize:12 }} />
              <Legend />
              <Bar dataKey="protein" name="Protein (g)" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="carbs"   name="Carbs (g)"   fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="fat"     name="Fat (g)"     fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="card animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Recent Entries</h2>
          <div className="space-y-2">
            {entries.slice(0, 10).map(entry => (
              <div key={entry._id}
                className="flex items-start justify-between py-3 px-3 rounded-xl bg-sage-50 dark:bg-gray-800 border border-sage-100 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sage-800 dark:text-gray-200">
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}
                  </p>
                  {entry.workout?.type && (
                    <p className="text-xs text-sage-500 dark:text-gray-500 mt-0.5">
                      🏃 {entry.workout.type}{entry.workout.duration && ` · ${entry.workout.duration}min`}
                      {entry.workout.caloriesBurned && ` · ${entry.workout.caloriesBurned} cal burned`}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-sage-400 dark:text-gray-500 mt-0.5 italic">"{entry.notes}"</p>
                  )}
                  {/* Macros row */}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {entry.protein  && <span className="text-xs bg-blue-100  dark:bg-blue-900/30  text-blue-600  dark:text-blue-300  px-2 py-0.5 rounded-full">Protein: {entry.protein}g</span>}
                    {entry.carbs    && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full">Carbs: {entry.carbs}g</span>}
                    {entry.fat      && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 px-2 py-0.5 rounded-full">Fat: {entry.fat}g</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                  <div className="flex gap-3 text-sm">
                    {entry.weight   && <span className="text-sage-700 dark:text-gray-300 font-medium">{entry.weight} kg</span>}
                    {entry.calories && <span className="text-amber-600 dark:text-amber-400 font-medium">{entry.calories} cal</span>}
                    {entry.water    && <span className="text-blue-500 font-medium">{entry.water} 💧</span>}
                  </div>
                  <button onClick={() => handleDelete(entry._id)} disabled={deletingId === entry._id}
                    className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors mt-1">
                    {deletingId === entry._id ? '...' : '🗑 Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && !loading && (
        <div className="card text-center py-12 animate-fadeIn">
          <span className="text-5xl block mb-3">📊</span>
          <p className="font-medium text-sage-700 dark:text-gray-300 mb-1">No entries yet</p>
          <p className="text-sm text-sage-400 dark:text-gray-500">Start logging above to see your progress here</p>
        </div>
      )}

      {loading && <div className="text-center py-8 text-sage-400">Loading progress data...</div>}
    </div>
  );
}
