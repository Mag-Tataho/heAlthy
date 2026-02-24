import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const MacroBadge = ({ protein, carbs, fat, calories }) => (
  <div className="flex flex-wrap gap-2 text-xs">
    {calories && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{calories} kcal</span>}
    {protein && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">P: {protein}g</span>}
    {carbs && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">C: {carbs}g</span>}
    {fat && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">F: {fat}g</span>}
  </div>
);

const MealCard = ({ meal }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-sage-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-sage-50 transition-colors text-left"
      >
        <div>
          <span className="text-xs font-semibold text-sage-400 uppercase tracking-wide">{meal.type}</span>
          <p className="font-medium text-sage-900 mt-0.5">{meal.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {meal.calories && (
            <span className="text-sm font-medium text-sage-600">{meal.calories} kcal</span>
          )}
          <span className="text-sage-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-white border-t border-sage-50 animate-fadeIn">
          {meal.description && (
            <p className="text-sm text-sage-600 mt-3 mb-3">{meal.description}</p>
          )}
          <MacroBadge protein={meal.protein} carbs={meal.carbs} fat={meal.fat} />
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-sage-500 uppercase tracking-wide mb-2">Ingredients</p>
              <ul className="space-y-1">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-sage-700 flex items-start gap-2">
                    <span className="text-sage-300 mt-0.5">•</span>
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default function MealPlanDetail() {
  const { id } = useParams();
  const [planDoc, setPlanDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(0);
  const [showGrocery, setShowGrocery] = useState(false);

  useEffect(() => {
    api
      .get(`/ai/meal-plans/${id}`)
      .then(({ data }) => setPlanDoc(data.plan))
      .catch(() => setError('Meal plan not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-16 text-sage-400">Loading meal plan...</div>;
  if (error)
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/meal-plans" className="btn-secondary">← Back to Plans</Link>
      </div>
    );

  const plan = planDoc?.plan || {};
  const isMultiDay = plan.days && Array.isArray(plan.days);
  const meals = isMultiDay ? plan.days[activeDay]?.meals : plan.meals;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/meal-plans" className="text-sm text-sage-500 hover:text-sage-700 mb-2 block">
            ← Back to Plans
          </Link>
          <h1 className="section-title">{plan.title || planDoc?.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-sage-500">
            <span>
              {new Date(planDoc?.createdAt).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
            {plan.totalCalories && <span>· ~{plan.totalCalories} kcal/day</span>}
            {plan.totalCaloriesPerDay && <span>· ~{plan.totalCaloriesPerDay} kcal/day</span>}
            <span className={planDoc?.isPremium ? 'badge-premium' : 'badge-free'}>
              {planDoc?.isPremium ? '✨ Premium' : '🌱 Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Day tabs for multi-day plans */}
      {isMultiDay && plan.days && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {plan.days.map((day, i) => (
            <button key={i} onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeDay === i ? 'bg-sage-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border border-sage-200 dark:border-gray-700 text-sage-600 dark:text-gray-300 hover:border-sage-400'
              }`}>
              {day.dayName || `Day ${day.day || i+1}`}
            </button>
          ))}
        </div>
      )}

      {/* Meals */}
      {isMultiDay ? (
        (plan.days[activeDay]?.meals || []).length > 0
          ? <div className="space-y-3">{plan.days[activeDay].meals.map((meal, i) => <MealCard key={i} meal={meal} />)}</div>
          : <div className="card text-center py-8 text-sage-400 dark:text-gray-500">No meal data for this day</div>
      ) : (
        plan.meals?.length > 0
          ? <div className="space-y-3">{plan.meals.map((meal, i) => <MealCard key={i} meal={meal} />)}</div>
          : <div className="card text-center py-8 text-sage-400 dark:text-gray-500">No meal data available</div>
      )}

      {/* Grocery list */}
      {(planDoc?.groceryList?.length > 0 || plan.groceryList?.length > 0) && (
        <div className="card">
          <button
            onClick={() => setShowGrocery(!showGrocery)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-display text-lg font-semibold text-sage-800">
              🛒 Grocery List ({(planDoc?.groceryList || plan.groceryList)?.length} items)
            </h3>
            <span className="text-sage-400">{showGrocery ? '▲' : '▼'}</span>
          </button>
          {showGrocery && (
            <div className="mt-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-2">
                {(planDoc?.groceryList || plan.groceryList || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-sage-700">
                    <input type="checkbox" className="rounded accent-sage-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
