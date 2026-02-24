import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const CATEGORIES = ['breakfast','lunch','dinner','snack','beverage','other'];
const MEAL_TIMES = ['breakfast','morning_snack','lunch','afternoon_snack','dinner','any'];
const CAT_EMOJI  = { breakfast:'🍳', lunch:'🥙', dinner:'🍲', snack:'🍎', beverage:'🥤', other:'🍽️' };

const emptyForm = { name:'', description:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', serving:'1 serving', ingredients:'', category:'other', mealTime:'any', isPublic:false };

// Defined outside to prevent textarea remount
function MealSharePanel({ meal, onShare, onCancel }) {
  const [msg, setMsg] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="mt-3 pt-3 border-t border-sage-100 dark:border-gray-800 animate-fadeIn">
      <textarea ref={ref} value={msg} onChange={e => setMsg(e.target.value)}
        className="input-field text-sm resize-none mb-2" rows={2}
        placeholder={`I made: ${meal.name}! 🍽️`} maxLength={300} />
      <div className="flex gap-2">
        <button onClick={() => onShare(meal, msg)} className="btn-primary text-sm py-2 flex-1">Share to Feed</button>
        <button onClick={onCancel} className="btn-secondary text-sm py-2">Cancel</button>
      </div>
    </div>
  );
}


// Full detail modal — works for own meals and public/community meals
function MealDetailModal({ meal, onClose }) {
  if (!meal) return null;
  const CAT_EMOJI_M = { breakfast:'🍳', lunch:'🥙', dinner:'🍲', snack:'🍎', beverage:'🥤', other:'🍽️' };
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 py-4 border-b border-sage-100 dark:border-gray-800 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CAT_EMOJI_M[meal.category] || '🍽️'}</span>
            <div>
              <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white">{meal.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {meal.serving && <p className="text-xs text-sage-400 dark:text-gray-500">Per {meal.serving}</p>}
                {meal.isPublic && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded-full">Public</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sage-100 dark:bg-gray-800 flex items-center justify-center text-sage-600 dark:text-gray-400 hover:bg-sage-200 dark:hover:bg-gray-700 flex-shrink-0 text-sm">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {meal.description && (
            <p className="text-sm text-sage-600 dark:text-gray-400 leading-relaxed">{meal.description}</p>
          )}

          {/* Macros */}
          {(meal.calories || meal.protein || meal.carbs || meal.fat) && (
            <div>
              <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nutrition Facts</p>
              <div className="grid grid-cols-2 gap-2">
                {meal.calories && <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center"><p className="text-xl font-bold text-orange-600 dark:text-orange-400">{meal.calories}</p><p className="text-xs text-orange-500 dark:text-orange-300">Calories</p></div>}
                {meal.protein  && <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center"><p className="text-xl font-bold text-blue-600 dark:text-blue-400">{meal.protein}g</p><p className="text-xs text-blue-500 dark:text-blue-300">Protein</p></div>}
                {meal.carbs    && <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center"><p className="text-xl font-bold text-amber-600 dark:text-amber-400">{meal.carbs}g</p><p className="text-xs text-amber-500 dark:text-amber-300">Carbs</p></div>}
                {meal.fat      && <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center"><p className="text-xl font-bold text-green-600 dark:text-green-400">{meal.fat}g</p><p className="text-xs text-green-500 dark:text-green-300">Fat</p></div>}
                {meal.fiber    && <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center"><p className="text-xl font-bold text-purple-600 dark:text-purple-400">{meal.fiber}g</p><p className="text-xs text-purple-500 dark:text-purple-300">Fiber</p></div>}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {meal.ingredients?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ingredients</p>
              <div className="space-y-1.5">
                {meal.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <span className="text-sm text-sage-700 dark:text-gray-300">{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category + Meal Time */}
          <div className="flex flex-wrap gap-2">
            {meal.category && <span className="text-xs bg-sage-50 dark:bg-gray-800 text-sage-700 dark:text-gray-300 px-3 py-1 rounded-full capitalize">{CAT_EMOJI_M[meal.category]} {meal.category}</span>}
            {meal.mealTime && meal.mealTime !== 'any' && <span className="text-xs bg-sage-50 dark:bg-gray-800 text-sage-700 dark:text-gray-300 px-3 py-1 rounded-full capitalize">⏰ {meal.mealTime.replace('_',' ')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomMeals() {
  const [meals, setMeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [shareId, setShareId]   = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const [error, setError]       = useState('');
  const [tab, setTab]           = useState('mine'); // mine | public
  const [viewMeal, setViewMeal]   = useState(null);

  const fetchMeals = async () => {
    try {
      const { data } = await api.get('/custom-meals');
      setMeals(data.meals || []);
    } catch { setError('Failed to load meals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeals(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (meal) => {
    setForm({
      name: meal.name, description: meal.description || '',
      calories: meal.calories || '', protein: meal.protein || '',
      carbs: meal.carbs || '', fat: meal.fat || '', fiber: meal.fiber || '',
      serving: meal.serving || '1 serving',
      ingredients: meal.ingredients?.join(', ') || '',
      category: meal.category || 'other', mealTime: meal.mealTime || 'any',
      isPublic: meal.isPublic || false,
    });
    setEditId(meal._id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Meal name is required');
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        calories: form.calories ? parseFloat(form.calories) : undefined,
        protein:  form.protein  ? parseFloat(form.protein)  : undefined,
        carbs:    form.carbs    ? parseFloat(form.carbs)    : undefined,
        fat:      form.fat      ? parseFloat(form.fat)      : undefined,
        fiber:    form.fiber    ? parseFloat(form.fiber)    : undefined,
        ingredients: form.ingredients ? form.ingredients.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (editId) {
        const { data } = await api.put(`/custom-meals/${editId}`, payload);
        setMeals(m => m.map(x => x._id === editId ? data.meal : x));
      } else {
        const { data } = await api.post('/custom-meals', payload);
        setMeals(m => [data.meal, ...m]);
      }
      setShowForm(false); setEditId(null); setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save meal');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/custom-meals/${id}`);
      setMeals(m => m.filter(x => x._id !== id));
      setDeleteId(null);
    } catch { setError('Failed to delete'); }
  };

  const handleShare = async (meal, msg) => {
    try {
      await api.post('/social/post', {
        type: 'custom_meal',
        content: msg || `I made this custom meal: ${meal.name}! 🍽️`,
        data: {
          mealId:      meal._id,
          name:        meal.name,
          description: meal.description || '',
          calories:    meal.calories,
          protein:     meal.protein,
          carbs:       meal.carbs,
          fat:         meal.fat,
          fiber:       meal.fiber,
          serving:     meal.serving,
          category:    meal.category,
          ingredients: meal.ingredients || [],
        },
        visibility: 'friends',
      });
      setShareId(null); setShareMsg('');
      alert('Shared to your friends feed! 🎉');
    } catch { setError('Failed to share'); }
  };

  const MacroPill = ({ label, value, unit = 'g', color }) => value ? (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label} {value}{unit}</span>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between animate-fadeIn">
        <div>
          <h1 className="section-title">Custom Meals</h1>
          <p className="text-sage-600 dark:text-gray-400 mt-1">Create and manage your own meals</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="btn-primary flex items-center gap-2">
          + New Meal
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-sage-50 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[['mine','My Meals'],['public','Community Meals']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white dark:bg-gray-700 text-sage-800 dark:text-white shadow-sm' : 'text-sage-500 dark:text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card animate-fadeIn border-sage-300 dark:border-sage-700">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">
            {editId ? '✏️ Edit Meal' : '+ Create Custom Meal'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Meal Name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="e.g. My Special Adobo" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field resize-none" rows={2} placeholder="Short description..." />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Meal Time</label>
              <select value={form.mealTime} onChange={e => set('mealTime', e.target.value)} className="input-field">
                {MEAL_TIMES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Serving Size</label>
              <input type="text" value={form.serving} onChange={e => set('serving', e.target.value)} className="input-field" placeholder="e.g. 1 cup, 200g" />
            </div>
            <div>
              <label className="label">Calories (kcal)</label>
              <input type="number" value={form.calories} onChange={e => set('calories', e.target.value)} className="input-field" placeholder="0" min="0" />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input type="number" value={form.protein} onChange={e => set('protein', e.target.value)} className="input-field" placeholder="0" min="0" step="0.1" />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input type="number" value={form.carbs} onChange={e => set('carbs', e.target.value)} className="input-field" placeholder="0" min="0" step="0.1" />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input type="number" value={form.fat} onChange={e => set('fat', e.target.value)} className="input-field" placeholder="0" min="0" step="0.1" />
            </div>
            <div>
              <label className="label">Fiber (g)</label>
              <input type="number" value={form.fiber} onChange={e => set('fiber', e.target.value)} className="input-field" placeholder="0" min="0" step="0.1" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Ingredients <span className="text-sage-400 font-normal">(comma-separated)</span></label>
              <input type="text" value={form.ingredients} onChange={e => set('ingredients', e.target.value)} className="input-field" placeholder="e.g. chicken, soy sauce, garlic" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button onClick={() => set('isPublic', !form.isPublic)}
                className={`w-11 h-6 rounded-full transition-all flex items-center ${form.isPublic ? 'bg-sage-600 justify-end' : 'bg-sage-200 dark:bg-gray-700 justify-start'}`}>
                <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
              </button>
              <div>
                <p className="text-sm font-medium text-sage-800 dark:text-gray-200">Share publicly</p>
                <p className="text-xs text-sage-400 dark:text-gray-500">Other users can discover this meal</p>
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</> : editId ? '💾 Save Changes' : '+ Create Meal'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setError(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* My Meals */}
      {tab === 'mine' && (
        loading ? (
          <div className="card text-center py-10"><div className="loading-pulse text-4xl mb-3">🍽️</div><p className="text-sage-500 dark:text-gray-400">Loading meals...</p></div>
        ) : meals.length === 0 ? (
          <div className="card text-center py-10"><div className="text-5xl mb-3">🍽️</div><p className="font-medium text-sage-700 dark:text-gray-300 mb-1">No custom meals yet</p><p className="text-sage-400 dark:text-gray-500 text-sm">Click + New Meal to get started!</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
            {meals.map(meal => (
              <div key={meal._id} className="card hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{CAT_EMOJI[meal.category] || '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sage-900 dark:text-white truncate">{meal.name}</p>
                      {meal.isPublic && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded-full flex-shrink-0">Public</span>}
                    </div>
                    {meal.description && <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5 line-clamp-1">{meal.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {meal.calories && <MacroPill label="🔥" value={meal.calories} unit=" kcal" color="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" />}
                      {meal.protein  && <MacroPill label="P" value={meal.protein}  color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />}
                      {meal.carbs    && <MacroPill label="C" value={meal.carbs}    color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />}
                      {meal.fat      && <MacroPill label="F" value={meal.fat}      color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" />}
                    </div>
                    {meal.ingredients?.length > 0 && (
                      <p className="text-xs text-sage-400 dark:text-gray-500 mt-1.5 line-clamp-1">📋 {meal.ingredients.join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-sage-50 dark:border-gray-800">
                  <button onClick={() => setViewMeal(meal)} className="btn-secondary text-xs py-1.5 flex-1">View</button>
                  <button onClick={() => openEdit(meal)} className="btn-secondary text-xs py-1.5 flex-1">✏️ Edit</button>
                  <button onClick={() => { setShareId(meal._id); setShareMsg(''); }}
                    className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 flex items-center justify-center text-sm transition-colors">📤</button>
                  <button onClick={() => setDeleteId(meal._id)}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm transition-colors">🗑️</button>
                </div>
                {shareId === meal._id && (
                  <MealSharePanel
                    key={meal._id}
                    meal={meal}
                    onShare={handleShare}
                    onCancel={() => setShareId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Public meals tab — browse community */}
      {tab === 'public' && <PublicMeals />}

      {/* View modal */}
      {viewMeal && <MealDetailModal meal={viewMeal} onClose={() => setViewMeal(null)} />}

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-display text-lg font-semibold text-center text-sage-900 dark:text-white mb-2">Delete Meal?</h3>
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

function PublicMeals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [viewMeal, setViewMeal] = useState(null);

  useEffect(() => {
    api.get(`/custom-meals/public?limit=30`).then(({ data }) => setMeals(data.meals || [])).finally(() => setLoading(false));
  }, []);

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data } = await api.get(`/custom-meals/public?q=${encodeURIComponent(q)}&limit=30`);
    setMeals(data.meals || []);
    setLoading(false);
  };

  const CAT_EMOJI = { breakfast:'🍳', lunch:'🥙', dinner:'🍲', snack:'🍎', beverage:'🥤', other:'🍽️' };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} className="input-field flex-1" placeholder="Search community meals..." />
        <button type="submit" className="btn-primary px-4">🔍</button>
      </form>
      {loading ? (
        <div className="card text-center py-8"><div className="loading-pulse text-3xl mb-2">🍽️</div><p className="text-sage-400">Loading...</p></div>
      ) : meals.length === 0 ? (
        <div className="card text-center py-8"><div className="text-4xl mb-2">🍽️</div><p className="text-sage-500 dark:text-gray-400">No public meals found yet. Be the first to share!</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {meals.map(meal => (
            <div key={meal._id} className="card hover:shadow-md transition-all cursor-pointer" onClick={() => setViewMeal(meal)}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{CAT_EMOJI[meal.category] || '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sage-900 dark:text-white">{meal.name}</p>
                  <p className="text-xs text-sage-400 dark:text-gray-500">by {meal.user?.name}</p>
                  {meal.description && <p className="text-xs text-sage-500 dark:text-gray-400 mt-1 line-clamp-2">{meal.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {meal.calories && <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded-full">🔥 {meal.calories} kcal</span>}
                    {meal.protein  && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded-full">P {meal.protein}g</span>}
                    {meal.carbs    && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-0.5 rounded-full">C {meal.carbs}g</span>}
                    {meal.fat      && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 px-2 py-0.5 rounded-full">F {meal.fat}g</span>}
                  </div>
                  {meal.ingredients?.length > 0 && (
                    <p className="text-xs text-sage-400 dark:text-gray-500 mt-1.5 line-clamp-1">📋 {meal.ingredients.join(', ')}</p>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
      {viewMeal && <MealDetailModal meal={viewMeal} onClose={() => setViewMeal(null)} />}
    </div>
  );
}
