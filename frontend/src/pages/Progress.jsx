import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '../utils/api';

const today = new Date().toISOString().split('T')[0];

export default function Progress() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: today,
    weight: '',
    calories: '',
    water: '',
    protein: '',
    carbs: '',
    fat: '',
    workoutType: '',
    workoutDuration: '',
    workoutCalories: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeChart, setActiveChart] = useState('weight');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const { data } = await api.get('/progress?limit=30');
      setEntries(data.entries || []);
    } catch {
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        ...(form.weight && { weight: parseFloat(form.weight) }),
        ...(form.calories && { calories: parseInt(form.calories) }),
        ...(form.water && { water: parseFloat(form.water) }),
        ...(form.protein && { protein: parseFloat(form.protein) }),
        ...(form.carbs && { carbs: parseFloat(form.carbs) }),
        ...(form.fat && { fat: parseFloat(form.fat) }),
        ...(form.notes && { notes: form.notes }),
        ...(form.workoutType && {
          workout: {
            type: form.workoutType,
            duration: form.workoutDuration ? parseInt(form.workoutDuration) : undefined,
            caloriesBurned: form.workoutCalories ? parseInt(form.workoutCalories) : undefined,
          },
        }),
      };

      await api.post('/progress', payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchProgress();
      setForm({ ...form, weight: '', calories: '', water: '', protein: '', carbs: '', fat: '', workoutType: '', workoutDuration: '', workoutCalories: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  // Prepare chart data
  const chartData = [...entries].reverse().map((e) => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
    calories: e.calories,
    water: e.water,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
  }));

  const chartConfigs = {
    weight: { key: 'weight', color: '#508650', unit: 'kg', label: 'Weight' },
    calories: { key: 'calories', color: '#f59e0b', unit: 'kcal', label: 'Calories' },
    water: { key: 'water', color: '#3b82f6', unit: 'glasses', label: 'Water' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-fadeIn">
        <h1 className="section-title">Progress Tracker</h1>
        <p className="text-sage-600 mt-1">Log and visualize your health journey</p>
      </div>

      {/* Log form */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 mb-4">Log Today's Data</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input-field"
                max={today}
              />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input-field"
                placeholder="e.g. 75.5"
              />
            </div>
            <div>
              <label className="label">Calories eaten</label>
              <input
                type="number"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: e.target.value })}
                className="input-field"
                placeholder="e.g. 1850"
              />
            </div>
            <div>
              <label className="label">Water (glasses)</label>
              <input
                type="number"
                step="0.5"
                value={form.water}
                onChange={(e) => setForm({ ...form, water: e.target.value })}
                className="input-field"
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input
                type="number"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: e.target.value })}
                className="input-field"
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input
                type="number"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                className="input-field"
                placeholder="e.g. 200"
              />
            </div>
          </div>

          {/* Workout */}
          <div className="border-t border-sage-100 pt-4 mb-4">
            <p className="text-sm font-medium text-sage-700 mb-3">Workout (optional)</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Activity type</label>
                <input
                  type="text"
                  value={form.workoutType}
                  onChange={(e) => setForm({ ...form, workoutType: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Running"
                />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input
                  type="number"
                  value={form.workoutDuration}
                  onChange={(e) => setForm({ ...form, workoutDuration: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 45"
                />
              </div>
              <div>
                <label className="label">Calories burned</label>
                <input
                  type="number"
                  value={form.workoutCalories}
                  onChange={(e) => setForm({ ...form, workoutCalories: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 350"
                />
              </div>
            </div>
          </div>

          {success && (
            <div className="mb-3 p-3 bg-sage-50 border border-sage-300 rounded-xl text-sage-700 text-sm text-center">
              ✅ Progress logged!
            </div>
          )}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              '📊 Log Progress'
            )}
          </button>
        </form>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-sage-800">Progress Charts</h2>
            <div className="flex gap-2">
              {Object.entries(chartConfigs).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setActiveChart(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeChart === key
                      ? 'bg-sage-600 text-white'
                      : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                  }`}
                >
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
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #c9dbc8',
                  borderRadius: '12px',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey={chartConfigs[activeChart].key}
                stroke={chartConfigs[activeChart].color}
                strokeWidth={2.5}
                dot={{ fill: chartConfigs[activeChart].color, r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Macro bar chart */}
      {chartData.length > 0 && (
        <div className="card animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 mb-4">Macro Overview (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4ede3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#74a072' }} />
              <YAxis tick={{ fontSize: 11, fill: '#74a072' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
              <Legend />
              <Bar dataKey="protein" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="carbs" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="fat" fill="#508650" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
        <div className="card animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 mb-4">Recent Entries</h2>
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between py-3 border-b border-sage-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-sage-800">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'short', day: 'numeric',
                    })}
                  </p>
                  {entry.workout?.type && (
                    <p className="text-xs text-sage-500 mt-0.5">
                      🏃 {entry.workout.type}
                      {entry.workout.duration && ` · ${entry.workout.duration}min`}
                    </p>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  {entry.weight && (
                    <span className="text-sage-700">
                      <strong>{entry.weight}</strong> kg
                    </span>
                  )}
                  {entry.calories && (
                    <span className="text-amber-600">
                      <strong>{entry.calories}</strong> kcal
                    </span>
                  )}
                  {entry.water && (
                    <span className="text-blue-600">
                      <strong>{entry.water}</strong> 💧
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-sage-400">Loading progress data...</div>}
    </div>
  );
}
