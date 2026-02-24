import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const GOAL_OPTIONS = ['lose_weight','maintain','gain_muscle','improve_health'];
const GOAL_LABELS  = { lose_weight:'Lose Weight', maintain:'Maintain', gain_muscle:'Gain Muscle', improve_health:'Improve Health' };

// Defined OUTSIDE to prevent textarea losing focus on re-render
function SharePanel({ plan, onShare, onCancel }) {
  const [msg, setMsg] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="mt-4 pt-4 border-t border-sage-100 dark:border-gray-800 animate-fadeIn">
      <p className="text-sm font-medium text-sage-700 dark:text-gray-300 mb-2">📤 Share to friends feed</p>
      <textarea ref={ref} value={msg} onChange={e => setMsg(e.target.value)}
        className="input-field text-sm resize-none mb-2" rows={2}
        placeholder={`Check out my ${plan.title}! 🥗`} maxLength={300} />
      <div className="flex gap-2">
        <button onClick={() => onShare(plan, msg)} className="btn-primary text-sm py-2 flex-1">Share Now</button>
        <button onClick={onCancel} className="btn-secondary text-sm py-2">Cancel</button>
      </div>
    </div>
  );
}

export default function MealPlans() {
  const { user } = useAuth();
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState('');
  const [goal,       setGoal]       = useState(user?.profile?.goal || 'maintain');
  const [duration,   setDuration]   = useState('weekly');
  const [deleteId,   setDeleteId]   = useState(null);
  const [shareId,    setShareId]    = useState(null);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/ai/meal-plans?limit=20');
      setPlans(data.plans || []);
    } catch { setError('Failed to load meal plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      const endpoint = user?.isPremium ? '/ai/personalized-meal-plan' : '/ai/basic-meal-plan';
      const body     = user?.isPremium ? { duration, goal } : { goal };
      await api.post(endpoint, body);
      await fetchPlans();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Check GROQ_API_KEY in backend .env');
    } finally { setGenerating(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/ai/meal-plans/${id}`);
      setPlans(p => p.filter(pl => pl._id !== id));
      setDeleteId(null);
    } catch { setError('Failed to delete'); }
  };

  const handleShare = async (plan, msg) => {
    try {
      const planData = plan.plan || {};

      // Build a normalized structure that works for both basic (meals[]) and premium (days[])
      let shareData = {
        title:         plan.title,
        totalCalories: plan.totalCalories,
        planType:      plan.type, // 'basic' or 'personalized'
      };

      if (planData.days && planData.days.length > 0) {
        // Premium 7-day plan — has days array with meals[]
        shareData.days = planData.days.map((d, i) => ({
          day:   d.dayName || d.name || (typeof d.day === 'string' ? d.day : `Day ${i+1}`),
          meals: (d.meals || []).map(m => typeof m === 'string'
            ? { name: m }
            : { name: m.name || 'Meal', calories: m.calories, type: m.type, protein: m.protein, carbs: m.carbs, fat: m.fat }
          ),
        }));
      } else if (planData.meals && planData.meals.length > 0) {
        // Basic 1-day plan — has meals array
        shareData.meals = planData.meals.map(m => ({
          type:     m.type || 'Meal',
          name:     m.name || 'Meal',
          calories: m.calories,
          protein:  m.protein,
          carbs:    m.carbs,
          fat:      m.fat,
          description: m.description,
        }));
      }

      await api.post('/social/post', {
        type:       'meal_plan',
        content:    msg || `Check out my ${plan.title}! 🥗`,
        data:       shareData,
        visibility: 'friends',
      });
      setShareId(null);
      alert('Shared to your friends feed! 🎉');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-fadeIn">
        <h1 className="section-title">Meal Plans</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">AI-generated plans tailored to your goals</p>
      </div>

      {/* Generate card */}
      <div className="card animate-fadeIn">
        <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">
          {user?.isPremium ? '✨ Generate Personalized Plan' : '🥗 Generate 1-Day Meal Plan'}
        </h2>
        {!user?.isPremium ? (
          /* Free: goal selector, always 1-day */
          <div className="mb-4">
            <label className="label">Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map(g => (
                <button key={g} type="button" onClick={() => setGoal(g)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${goal === g ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/30 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
            <p className="text-xs text-sage-400 dark:text-gray-500 mt-2">Free plan generates a 1-day personalised meal plan</p>
          </div>
        ) : (
          /* Premium: goal + duration (1-day or 7-day) */
          <>
            <div className="mb-4">
              <label className="label">Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(g => (
                  <button key={g} type="button" onClick={() => setGoal(g)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${goal === g ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/30 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                    {GOAL_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Duration</label>
              <div className="flex gap-2">
                {[['1day','1-Day Plan'],['weekly','7-Day Plan']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setDuration(val)}
                    className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${duration === val ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/30 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2">
          {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating... (may take 15–20s)</> : '🤖 Generate Meal Plan'}
        </button>
        {!user?.isPremium && (
          <p className="text-xs text-center text-sage-400 dark:text-gray-500 mt-2">
            Free: 1-day plan · <Link to="/settings" className="underline">Upgrade to Premium</Link> for 7-day plans
          </p>
        )}
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="card text-center py-10"><div className="loading-pulse text-4xl mb-3">🥗</div><p className="text-sage-500 dark:text-gray-400">Loading...</p></div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-10"><div className="text-5xl mb-3">🍽️</div><p className="font-medium text-sage-700 dark:text-gray-300">No meal plans yet</p><p className="text-sage-400 dark:text-gray-500 text-sm mt-1">Generate your first plan above!</p></div>
      ) : (
        <div className="space-y-3 stagger-children">
          {plans.map(plan => (
            <div key={plan._id} className="card hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{plan.type === 'personalized' ? '⭐' : '🥗'}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sage-900 dark:text-white truncate">{plan.title}</p>
                    <p className="text-xs text-sage-400 dark:text-gray-500 mt-0.5">
                      {new Date(plan.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      {plan.totalCalories ? ` · ~${plan.totalCalories} kcal/day` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/meal-plans/${plan._id}`} className="btn-secondary text-xs py-1.5 px-3">View</Link>
                  <button onClick={() => setShareId(shareId === plan._id ? null : plan._id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${shareId === plan._id ? 'bg-blue-200 dark:bg-blue-800 text-blue-700' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}>
                    📤
                  </button>
                  <button onClick={() => setDeleteId(plan._id)}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
              {shareId === plan._id && (
                <SharePanel key={`share-${plan._id}`} plan={plan} onShare={handleShare} onCancel={() => setShareId(null)} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-display text-lg font-semibold text-center text-sage-900 dark:text-white mb-2">Delete Meal Plan?</h3>
            <p className="text-sage-600 dark:text-gray-400 text-sm text-center mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl">Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
