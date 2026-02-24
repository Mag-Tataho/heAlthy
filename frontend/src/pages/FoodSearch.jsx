import React, { useState, useCallback } from 'react';
import api from '../utils/api';

const SOURCE_BADGE = {
  'Open Food Facts': { label: '📦 Real Data', color: 'bg-blue-100 text-blue-700' },
  'Open Food Facts + AI': { label: '📦 + 🤖 AI', color: 'bg-purple-100 text-purple-700' },
  'AI Generated': { label: '🤖 AI Generated', color: 'bg-amber-100 text-amber-700' },
};

const CATEGORY_COLORS = {
  protein: 'bg-blue-100 text-blue-700',
  grains: 'bg-yellow-100 text-yellow-700',
  vegetables: 'bg-green-100 text-green-700',
  fruits: 'bg-orange-100 text-orange-700',
  dairy: 'bg-purple-100 text-purple-700',
  nuts: 'bg-amber-100 text-amber-700',
  legumes: 'bg-red-100 text-red-700',
  snacks: 'bg-pink-100 text-pink-700',
  beverages: 'bg-cyan-100 text-cyan-700',
  other: 'bg-sage-100 text-sage-700',
};

const MacroBar = ({ protein, carbs, fat, calories }) => {
  if (!calories) return null;
  const pP = Math.round((protein * 4 / calories) * 100);
  const pC = Math.round((carbs * 4 / calories) * 100);
  const pF = Math.round((fat * 9 / calories) * 100);
  return (
    <div className="mt-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-blue-400 rounded-full" style={{ width: `${pP}%` }} title={`Protein ${pP}%`} />
        <div className="bg-amber-400 rounded-full" style={{ width: `${pC}%` }} title={`Carbs ${pC}%`} />
        <div className="bg-green-400 rounded-full" style={{ width: `${pF}%` }} title={`Fat ${pF}%`} />
      </div>
      <div className="flex gap-3 mt-1 text-xs text-sage-400">
        <span className="text-blue-500">P {pP}%</span>
        <span className="text-amber-500">C {pC}%</span>
        <span className="text-green-500">F {pF}%</span>
      </div>
    </div>
  );
};

const FoodCard = ({ food, onSelect, isSelected }) => (
  <button
    onClick={() => onSelect(food)}
    className={`card text-left transition-all duration-200 hover:shadow-md w-full ${
      isSelected ? 'ring-2 ring-sage-500 border-sage-300' : 'hover:border-sage-300'
    }`}
  >
    <div className="flex gap-3">
      {/* Food emoji */}
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-sage-50 dark:bg-gray-800 flex items-center justify-center">
        <span className="text-2xl">
          {food.category?.includes('fruit') ? '🍎' :
           food.category?.includes('vegetable') ? '🥦' :
           food.category?.includes('protein') ? '🥩' :
           food.category?.includes('grain') ? '🌾' :
           food.category?.includes('dairy') ? '🥛' :
           food.category?.includes('nut') ? '🥜' :
           food.category?.includes('beverage') ? '🥤' :
           food.category?.includes('snack') ? '🍿' :
           food.category?.includes('legume') ? '🫘' : '🍽️'}
        </span>
      </div>

      {/* Food details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-medium text-sage-900 text-sm leading-tight line-clamp-2">{food.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[food.category] || CATEGORY_COLORS.other}`}>
            {food.category?.slice(0, 10)}
          </span>
        </div>

        <p className="text-xs text-sage-400 mb-1.5">{food.serving}</p>

        <div className="flex gap-3 text-xs font-medium">
          <span className="text-orange-600">{food.calories} kcal</span>
          <span className="text-blue-600">P {food.protein}g</span>
          <span className="text-amber-600">C {food.carbs}g</span>
          <span className="text-green-600">F {food.fat}g</span>
        </div>

        <MacroBar protein={food.protein} carbs={food.carbs} fat={food.fat} calories={food.calories} />
      </div>
    </div>

    {/* Source badge */}
    <div className="mt-2 flex justify-end">
      <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_BADGE[food.source]?.color || 'bg-sage-100 text-sage-500'}`}>
        {SOURCE_BADGE[food.source]?.label || food.source}
      </span>
    </div>
  </button>
);

const FoodDetail = ({ food, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const loadDetailedInfo = async () => {
    setLoadingInfo(true);
    try {
      const { data } = await api.get(`/food/info?name=${encodeURIComponent(food.name)}`);
      setInfo(data.info);
    } catch {
      // silently fail
    } finally {
      setLoadingInfo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-sage-100 dark:border-gray-800 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white truncate pr-2">{food.name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 hover:bg-sage-200 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Food emoji header */}
          <div className="w-16 h-16 rounded-2xl bg-sage-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
            <span className="text-4xl">
              {food.category?.includes('fruit') ? '🍎' :
               food.category?.includes('vegetable') ? '🥦' :
               food.category?.includes('protein') ? '🥩' :
               food.category?.includes('grain') ? '🌾' :
               food.category?.includes('dairy') ? '🥛' :
               food.category?.includes('nut') ? '🥜' :
               food.category?.includes('beverage') ? '🥤' :
               food.category?.includes('snack') ? '🍿' :
               food.category?.includes('legume') ? '🫘' : '🍽️'}
            </span>
          </div>

          {/* Main macros */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Calories', value: food.calories, unit: 'kcal', color: 'text-orange-600' },
              { label: 'Protein', value: food.protein, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbs', value: food.carbs, unit: 'g', color: 'text-amber-600' },
              { label: 'Fat', value: food.fat, unit: 'g', color: 'text-green-600' },
            ].map((m) => (
              <div key={m.label} className="bg-sage-50 rounded-xl p-2">
                <p className={`text-lg font-display font-semibold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-sage-400">{m.unit}</p>
                <p className="text-xs text-sage-600 font-medium">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Extra macros */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {food.fiber > 0 && (
              <div className="flex justify-between bg-sage-50 rounded-lg px-3 py-2">
                <span className="text-sage-500">Fiber</span>
                <span className="font-medium text-sage-800">{food.fiber}g</span>
              </div>
            )}
            {food.sugar > 0 && (
              <div className="flex justify-between bg-sage-50 rounded-lg px-3 py-2">
                <span className="text-sage-500">Sugar</span>
                <span className="font-medium text-sage-800">{food.sugar}g</span>
              </div>
            )}
          </div>

          {/* Macro bar */}
          <div>
            <p className="text-xs text-sage-500 mb-1 font-medium">Macro Breakdown</p>
            <MacroBar protein={food.protein} carbs={food.carbs} fat={food.fat} calories={food.calories} />
          </div>

          {/* Load detailed AI info button */}
          {!info && (
            <button
              onClick={loadDetailedInfo}
              disabled={loadingInfo}
              className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
            >
              {loadingInfo ? (
                <>
                  <div className="w-4 h-4 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
                  Loading details...
                </>
              ) : (
                '🤖 Get AI Health Insights'
              )}
            </button>
          )}

          {/* Detailed AI info */}
          {info && (
            <div className="space-y-3 animate-fadeIn">
              {info.healthBenefits?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 uppercase tracking-wide mb-2">Health Benefits</p>
                  <ul className="space-y-1">
                    {info.healthBenefits.map((b, i) => (
                      <li key={i} className="text-sm text-sage-700 flex items-start gap-2">
                        <span className="text-sage-400 mt-0.5">✓</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {info.vitamins?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 uppercase tracking-wide mb-2">Vitamins & Minerals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(info.vitamins || []), ...(info.minerals || [])].map((v, i) => (
                      <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {info.tips && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tip</p>
                  <p className="text-sm text-amber-800">{info.tips}</p>
                </div>
              )}
            </div>
          )}

          {/* Serving info */}
          <p className="text-xs text-center text-sage-400">Per {food.serving}</p>
        </div>
      </div>
    </div>
  );
};

export default function FoodSearch() {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setFoods([]);
    setHasSearched(true);

    try {
      const { data } = await api.get(`/food/search?q=${encodeURIComponent(query)}&limit=20`);
      setFoods(data.foods || []);
      setSource(data.source || '');
      if ((data.foods || []).length === 0) {
        setError('No foods found. Try a different search term.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Search failed';
      setError(`Search failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const popularSearches = [
    'chicken breast', 'brown rice', 'banana', 'broccoli',
    'salmon', 'oatmeal', 'eggs', 'avocado', 'sweet potato', 'Greek yogurt',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="section-title">Food Search</h1>
        <p className="text-sage-600 mt-1">
          Search millions of real foods — powered by Open Food Facts database + AI
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3 animate-fadeIn">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field flex-1 text-base"
          placeholder="Search any food... e.g. chicken, rice, Lucky Me noodles"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary flex-shrink-0 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : '🔍'}
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* Source indicator */}
      {source && (
        <div className="flex items-center gap-2 text-xs text-sage-500 animate-fadeIn">
          <span>Results from:</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[source]?.color || 'bg-sage-100 text-sage-500'}`}>
            {SOURCE_BADGE[source]?.label || source}
          </span>
          <span className="text-sage-400">· {foods.length} results</span>
        </div>
      )}

      {/* Popular searches (shown before first search) */}
      {!hasSearched && (
        <div className="animate-fadeIn">
          <p className="text-sm font-medium text-sage-600 mb-3">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  // Auto search
                  setLoading(true);
                  setHasSearched(true);
                  api.get(`/food/search?q=${encodeURIComponent(term)}&limit=20`)
                    .then(({ data }) => {
                      setFoods(data.foods || []);
                      setSource(data.source || '');
                    })
                    .catch(() => setError('Search failed'))
                    .finally(() => setLoading(false));
                }}
                className="px-3 py-1.5 bg-white border border-sage-200 text-sage-600 text-sm rounded-full hover:border-sage-400 hover:text-sage-800 transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card text-center py-10 animate-fadeIn">
          <div className="text-4xl mb-3 loading-pulse">🔍</div>
          <p className="font-medium text-sage-800">Searching foods...</p>
          <p className="text-sm text-sage-400 mt-1">Checking real database + AI</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fadeIn">
          {error}
        </div>
      )}

      {/* Results grid */}
      {!loading && foods.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {foods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              onSelect={setSelected}
              isSelected={selected?.id === food.id}
            />
          ))}
        </div>
      )}

      {/* Food detail modal */}
      {selected && (
        <FoodDetail food={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
