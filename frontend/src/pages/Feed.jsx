import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  MessageCircle,
  Scale,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  Users,
  X,
} from '../components/OpenMojiIcons';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import FoodCategoryIcon from '../components/FoodCategoryIcon';

// ── All helpers defined OUTSIDE components to prevent re-render focus loss ──

const POST_TYPE_META = {
  weight_update:   { icon: Scale,           label: 'Weight Update',  color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  meal_plan:       { icon: UtensilsCrossed, label: 'Meal Plan',      color: 'bg-sage-50 dark:bg-sage-900/20 text-sage-600 dark:text-sage-400' },
  custom_meal:     { icon: UtensilsCrossed, label: 'Custom Meal',    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  calorie_log:     { icon: Flame,           label: 'Calorie Log',    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  workout_log:     { icon: Dumbbell,        label: 'Workout',        color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  progress_update: { icon: TrendingUp,      label: 'Progress Update',color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
};

const POST_TYPES = [
  { value: 'weight_update',   label: 'Weight Update' },
  { value: 'calorie_log',     label: 'Calorie Log' },
  { value: 'workout_log',     label: 'Workout Log' },
  { value: 'progress_update', label: 'Progress Update' },
];

const toFoodCategory = (value) => {
  if (value === 'beverage') return 'beverages';
  if (['breakfast', 'lunch', 'dinner', 'snack'].includes(value)) return 'snacks';
  return value || 'other';
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Avatar({ name, size = 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'xs' ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-full bg-sage-600 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// Full expandable meal plan card for Feed
function MealPlanCard({ data }) {
  const [expanded, setExpanded] = React.useState(false);
  const [expandedDays, setExpandedDays] = React.useState({});
  if (!data) return null;

  const toggleDay = (i) => setExpandedDays(prev => ({ ...prev, [i]: !prev[i] }));
  const hasDays  = data.days?.length > 0;
  const hasMeals = data.meals?.length > 0 && !hasDays;

  return (
    <div className="mt-2 border border-sage-100 dark:border-gray-700 rounded-xl overflow-hidden">

      {/* Header + collapse toggle */}
      <div className="p-3 bg-sage-50 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sage-800 dark:text-gray-200 text-sm inline-flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-sage-600 dark:text-sage-300" strokeWidth={1.9} aria-hidden="true" />
                {data.title}
              </p>
              {data.planType === 'personalized' && (
                <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Personalized
                </span>
              )}
            </div>
            {data.totalCalories && (
              <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5">~{data.totalCalories} kcal/day</p>
            )}
          </div>
          {(hasDays || hasMeals) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex-shrink-0 text-xs font-medium text-sage-600 dark:text-gray-300 border border-sage-200 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  View Plan
                </>
              )}
            </button>
          )}
        </div>

        {/* Collapsed preview */}
        {!expanded && hasDays && (
          <div className="mt-2 space-y-1">
            {data.days.slice(0, 2).map((day, i) => (
              <div key={i} className="text-xs text-sage-500 dark:text-gray-400">
                <span className="font-medium text-sage-700 dark:text-gray-300">{day.dayName || `Day ${i+1}`}:</span>{' '}
                {day.meals?.length > 0
                  ? day.meals.map(m => m.name).filter(Boolean).join(' · ')
                  : <span className="italic text-sage-300 dark:text-gray-600">no meal details — reshare to update</span>
                }
              </div>
            ))}
            {data.days.length > 2 && (
              <p className="text-xs text-sage-400 dark:text-gray-500">+{data.days.length - 2} more days</p>
            )}
          </div>
        )}
        {!expanded && hasMeals && (
          <div className="mt-2 space-y-0.5">
            {data.meals.slice(0, 3).map((m, i) => (
              <p key={i} className="text-xs text-sage-500 dark:text-gray-400">
                <span className="font-medium text-sage-600 dark:text-gray-300">{m.type}:</span> {m.name}
                {m.calories ? ` · ${m.calories} kcal` : ''}
              </p>
            ))}
            {data.meals.length > 3 && <p className="text-xs text-sage-400 dark:text-gray-500">+{data.meals.length - 3} more meals</p>}
          </div>
        )}
      </div>

      {/* Expanded — scrollable */}
      {expanded && (
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-sage-50 dark:divide-gray-800">

          {/* 1-day free plan (meals[]) */}
          {hasMeals && (
            <div className="p-3 space-y-2">
              {data.meals.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-xs font-semibold text-sage-500 dark:text-gray-400 w-28 flex-shrink-0 capitalize">{m.type || `Meal ${i+1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-sage-800 dark:text-gray-200">{m.name}</p>
                    {m.description && <p className="text-xs text-sage-400 dark:text-gray-500 mt-0.5">{m.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {m.calories && <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-500 px-1.5 py-0.5 rounded">kcal {m.calories}</span>}
                      {m.protein  && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-1.5 py-0.5 rounded">P {m.protein}g</span>}
                      {m.carbs    && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-500 px-1.5 py-0.5 rounded">C {m.carbs}g</span>}
                      {m.fat      && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-500 px-1.5 py-0.5 rounded">F {m.fat}g</span>}
                    </div>
                    {m.ingredients?.length > 0 && (
                      <p className="text-xs text-sage-300 dark:text-gray-600 mt-1">{m.ingredients.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 1-day or 7-day premium plan (days[]) — each day collapsible */}
          {hasDays && data.days.map((day, i) => (
            <div key={i} className="bg-white dark:bg-gray-900">
              <button
                onClick={() => toggleDay(i)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sage-50 dark:bg-gray-800 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sage-500 dark:text-gray-400">Day {day.day || i+1}</span>
                  <span className="text-xs font-semibold text-sage-800 dark:text-gray-200">{day.dayName || ''}</span>
                  {day.totalCalories && <span className="text-xs text-sage-400 dark:text-gray-500">· {day.totalCalories} kcal</span>}
                </div>
                {expandedDays[i]
                  ? <ChevronUp className="h-3.5 w-3.5 text-sage-400" strokeWidth={2} aria-hidden="true" />
                  : <ChevronDown className="h-3.5 w-3.5 text-sage-400" strokeWidth={2} aria-hidden="true" />}
              </button>
              {expandedDays[i] && (
                <div className="px-4 pb-3 space-y-1.5">
                  {day.meals?.length > 0 ? day.meals.map((m, j) => (
                    <div key={j} className="flex items-start gap-2 p-2 bg-sage-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-xs font-medium text-sage-500 dark:text-gray-400 w-28 flex-shrink-0 capitalize">{m.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-sage-800 dark:text-gray-200">{m.name}</p>
                        {m.description && <p className="text-xs text-sage-400 dark:text-gray-500">{m.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {m.calories && <span className="text-xs text-orange-500">kcal {m.calories}</span>}
                          {m.protein  && <span className="text-xs text-blue-500 ml-1">P {m.protein}g</span>}
                          {m.carbs    && <span className="text-xs text-amber-500 ml-1">C {m.carbs}g</span>}
                          {m.fat      && <span className="text-xs text-green-500 ml-1">F {m.fat}g</span>}
                        </div>
                        {m.ingredients?.length > 0 && (
                          <p className="text-xs text-sage-300 dark:text-gray-600 mt-0.5">{m.ingredients.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-sage-300 dark:text-gray-600 italic">No meal details — reshare to update</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Clickable custom meal card — shows full details in a modal
function CustomMealCard({ data }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Preview card — click to expand */}
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left mt-1 p-3 bg-white dark:bg-gray-700 border border-sage-100 dark:border-gray-600 rounded-xl hover:border-sage-300 dark:hover:border-gray-500 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <FoodCategoryIcon
            category={toFoodCategory(data.category)}
            className="h-7 w-7 text-sage-600 dark:text-sage-300"
            strokeWidth={1.9}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sage-800 dark:text-gray-200 group-hover:text-sage-600 dark:group-hover:text-white transition-colors">
              {data.name}
            </p>
            {data.description && (
              <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5 line-clamp-1">{data.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {data.calories && <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">kcal {data.calories}</span>}
              {data.protein  && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">P {data.protein}g</span>}
              {data.carbs    && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">C {data.carbs}g</span>}
              {data.fat      && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">F {data.fat}g</span>}
            </div>
          </div>
          <span className="text-xs font-medium text-sage-400 dark:text-gray-500 group-hover:text-sage-600 dark:group-hover:text-gray-300 flex-shrink-0 border border-sage-200 dark:border-gray-600 rounded-lg px-2 py-1 transition-colors">View</span>
        </div>
        {data.ingredients?.length > 0 && (
          <p className="text-xs text-sage-400 dark:text-gray-500 mt-2 line-clamp-1">{data.ingredients.join(', ')}</p>
        )}
      </button>

      {/* Full detail modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 py-4 border-b border-sage-100 dark:border-gray-800 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FoodCategoryIcon
                  category={toFoodCategory(data.category)}
                  className="h-8 w-8 text-sage-600 dark:text-sage-300"
                  strokeWidth={1.9}
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white">{data.name}</h3>
                  {data.serving && <p className="text-xs text-sage-400 dark:text-gray-500">Per {data.serving}</p>}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-sage-100 dark:bg-gray-800 flex items-center justify-center text-sage-600 dark:text-gray-400 hover:bg-sage-200 dark:hover:bg-gray-700 flex-shrink-0">
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Description */}
              {data.description && (
                <p className="text-sm text-sage-600 dark:text-gray-400 leading-relaxed">{data.description}</p>
              )}

              {/* Macros grid */}
              {(data.calories || data.protein || data.carbs || data.fat) && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nutrition</p>
                  <div className="grid grid-cols-2 gap-2">
                    {data.calories && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{data.calories}</p>
                        <p className="text-xs text-orange-500 dark:text-orange-300">Calories</p>
                      </div>
                    )}
                    {data.protein && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.protein}g</p>
                        <p className="text-xs text-blue-500 dark:text-blue-300">Protein</p>
                      </div>
                    )}
                    {data.carbs && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{data.carbs}g</p>
                        <p className="text-xs text-amber-500 dark:text-amber-300">Carbs</p>
                      </div>
                    )}
                    {data.fat && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.fat}g</p>
                        <p className="text-xs text-green-500 dark:text-green-300">Fat</p>
                      </div>
                    )}
                    {data.fiber && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{data.fiber}g</p>
                        <p className="text-xs text-purple-500 dark:text-purple-300">Fiber</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {data.ingredients?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ingredients</p>
                  <div className="space-y-1.5">
                    {data.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                        <span className="text-sm text-sage-700 dark:text-gray-300">{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              {data.category && data.category !== 'other' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide">Category:</span>
                  <span className="text-xs bg-sage-50 dark:bg-gray-800 text-sage-700 dark:text-gray-300 px-2 py-0.5 rounded-full capitalize">{data.category}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PostData({ type, data }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mt-2 p-3 bg-sage-50 dark:bg-gray-800 rounded-xl text-sm space-y-1.5">
      {type === 'weight_update' && (
        <>
          <p className="font-semibold text-sage-800 dark:text-gray-200 inline-flex items-center gap-1.5">
            <Scale className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Weight: {data.weight} kg
          </p>
          {data.change && <p className="text-xs text-sage-500 dark:text-gray-400">{data.change > 0 ? `+${data.change}` : data.change} kg change</p>}
        </>
      )}
      {type === 'meal_plan' && <MealPlanCard data={data} />}

      {type === 'custom_meal' && <CustomMealCard data={data} />}
      {type === 'calorie_log' && (
        <>
          <p className="font-semibold text-sage-800 dark:text-gray-200 inline-flex items-center gap-1.5">
            <Flame className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {data.calories} kcal today
          </p>
          {data.goal && <p className="text-xs text-sage-500 dark:text-gray-400">Goal: {data.goal} kcal</p>}
          {data.meals?.length > 0 && (
            <p className="text-xs text-sage-400 dark:text-gray-500 mt-1">Meals: {data.meals.join(', ')}</p>
          )}
        </>
      )}
      {type === 'workout_log' && (
        <>
          <p className="font-semibold text-sage-800 dark:text-gray-200 inline-flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {data.workout}
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.duration  && (
              <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {data.duration} min
              </span>
            )}
            {data.calories  && (
              <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {data.calories} kcal
              </span>
            )}
            {data.intensity && <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full capitalize">{data.intensity}</span>}
          </div>
        </>
      )}
      {type === 'progress_update' && (
        <>
          <p className="font-semibold text-sage-800 dark:text-gray-200 inline-flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Progress Update
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.weight      && (
              <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {data.weight} kg
              </span>
            )}
            {data.bodyFat     && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">Body fat: {data.bodyFat}%</span>}
            {data.muscleMass  && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Muscle: {data.muscleMass} kg</span>}
          </div>
          {data.note && <p className="text-xs text-sage-400 dark:text-gray-500 mt-1">{data.note}</p>}
        </>
      )}
    </div>
  );
}

// ── Comment / Reply ──────────────────────────────────────────────────────────

function CommentItem({ comment, postId, currentUserId, postOwnerId, onDeleted, onReplied }) {
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const replyRef = React.useRef(null);

  React.useEffect(() => { if (showReply) replyRef.current?.focus(); }, [showReply]);

  const canDelete = comment.user?._id?.toString() === currentUserId || postOwnerId === currentUserId;

  const handleDelete = async () => {
    try {
      await api.delete(`/social/post/${postId}/comment/${comment._id}`);
      onDeleted(comment._id);
    } catch { /* silent */ }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/social/post/${postId}/comment/${comment._id}/reply`, { text: replyText });
      onReplied(comment._id, data.reply);
      setReplyText('');
      setShowReply(false);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2 group">
        <Avatar name={comment.user?.name} size="xs" />
        <div className="flex-1 min-w-0">
          <div className="bg-sage-50 dark:bg-gray-800 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-sage-800 dark:text-gray-200">{comment.user?.name}</p>
            <p className="text-xs text-sage-700 dark:text-gray-300 mt-0.5">{comment.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-sage-400 dark:text-gray-500">{timeAgo(comment.createdAt)}</span>
            <button onClick={() => setShowReply(r => !r)} className="text-xs text-sage-400 dark:text-gray-500 hover:text-sage-600 dark:hover:text-gray-300">Reply</button>
            {canDelete && (
              <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-8 space-y-1">
          {comment.replies.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <Avatar name={r.user?.name} size="xs" />
              <div className="flex-1 bg-sage-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-sage-800 dark:text-gray-200">{r.user?.name}</p>
                <p className="text-xs text-sage-700 dark:text-gray-300 mt-0.5">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReply && (
        <div className="ml-8 flex gap-2">
          <input ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
            className="flex-1 text-xs bg-sage-50 dark:bg-gray-800 border border-sage-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sage-400 dark:text-gray-200"
            placeholder="Write a reply..." maxLength={300} />
          <button onClick={handleReply} disabled={submitting || !replyText.trim()}
            className="text-xs bg-sage-600 text-white rounded-xl px-3 py-2 hover:bg-sage-700 disabled:opacity-50">
            {submitting ? '...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, onDeleted }) {
  const meta = POST_TYPE_META[post.type] || POST_TYPE_META.progress_update;
  const MetaIcon = meta.icon;
  const [liked,       setLiked]       = React.useState(post.likes?.includes(currentUserId));
  const [likeCount,   setLikeCount]   = React.useState(post.likes?.length || 0);
  const [showComments,setShowComments]= React.useState(false);
  const [comments,    setComments]    = React.useState(post.comments || []);
  const [commentText, setCommentText] = React.useState('');
  const [posting,     setPosting]     = React.useState(false);
  const commentRef = React.useRef(null);
  const isOwner = post.user?._id?.toString() === currentUserId;

  const handleLike = async () => {
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try { await api.post(`/social/post/${post._id}/like`); } catch { /* revert */ setLiked(l => !l); setLikeCount(c => liked ? c + 1 : c - 1); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await api.delete(`/social/post/${post._id}`); onDeleted(post._id); } catch { /* silent */ }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/social/post/${post._id}/comment`, { text: commentText });
      setComments(data.comments);
      setCommentText('');
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  const handleCommentDeleted = (cId) => setComments(cs => cs.filter(c => c._id !== cId));
  const handleReplied = (cId, reply) => setComments(cs => cs.map(c => c._id === cId ? { ...c, replies: [...(c.replies||[]), reply] } : c));

  React.useEffect(() => { if (showComments) commentRef.current?.focus(); }, [showComments]);

  return (
    <div className="card animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.user?.name} />
          <div>
            <p className="font-semibold text-sage-900 dark:text-white text-sm">{post.user?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color} inline-flex items-center gap-1`}>
                <MetaIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {meta.label}
              </span>
              <span className="text-xs text-sage-400 dark:text-gray-500">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <button onClick={handleDelete} className="text-sage-300 dark:text-gray-600 hover:text-red-400 transition-colors text-sm flex-shrink-0">
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && <p className="mt-3 text-sm text-sage-800 dark:text-gray-200 leading-relaxed">{post.content}</p>}
      <PostData type={post.type} data={post.data} />

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sage-50 dark:border-gray-800">
        <button onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? 'text-red-500' : 'text-sage-400 dark:text-gray-500 hover:text-red-400'}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} strokeWidth={2} aria-hidden="true" />
          {likeCount}
        </button>
        <button onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-sage-400 dark:text-gray-500 hover:text-sage-600 dark:hover:text-gray-300 transition-colors">
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {comments.length}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 space-y-3 animate-fadeIn">
          {comments.map(c => (
            <CommentItem key={c._id} comment={c} postId={post._id}
              currentUserId={currentUserId} postOwnerId={post.user?._id?.toString()}
              onDeleted={handleCommentDeleted} onReplied={handleReplied} />
          ))}
          <div className="flex gap-2 mt-2">
            <input ref={commentRef} value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
              className="flex-1 text-sm bg-sage-50 dark:bg-gray-800 border border-sage-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sage-400 dark:text-gray-200"
              placeholder="Write a comment..." maxLength={500} />
            <button onClick={handleComment} disabled={posting || !commentText.trim()}
              className="text-sm bg-sage-600 text-white rounded-xl px-4 py-2 hover:bg-sage-700 disabled:opacity-50 font-medium">
              {posting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Share Form ───────────────────────────────────────────────────────────────

function ShareForm({ onClose, onPosted }) {
  const [type,    setType]    = React.useState('weight_update');
  const [content, setContent] = React.useState('');
  const [fields,  setFields]  = React.useState({});
  const [posting, setPosting] = React.useState(false);
  const [error,   setError]   = React.useState('');

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const handlePost = async () => {
    if (!content.trim() && !Object.keys(fields).length) { setError('Add some content before posting.'); return; }
    setPosting(true); setError('');
    try {
      await api.post('/social/post', { type, content, data: fields, visibility: 'friends' });
      onPosted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post');
    } finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-sage-100 dark:border-gray-800">
          <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white">Share Update</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sage-100 dark:bg-gray-800 flex items-center justify-center text-sage-600 dark:text-gray-400 hover:bg-sage-200 dark:hover:bg-gray-700">
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="label">Post Type</label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map(t => (
                <button key={t.value} onClick={() => { setType(t.value); setFields({}); }}
                  className={`p-2.5 rounded-xl border text-sm font-medium transition-all text-left ${type === t.value ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/30 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic fields */}
          {type === 'weight_update' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Current Weight (kg)</label><input type="number" className="input-field" placeholder="70" onChange={e => set('weight', e.target.value)} /></div>
              <div><label className="label">Change (kg)</label><input type="number" className="input-field" placeholder="-1.5" onChange={e => set('change', e.target.value)} /></div>
            </div>
          )}
          {type === 'calorie_log' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Calories</label><input type="number" className="input-field" placeholder="1800" onChange={e => set('calories', e.target.value)} /></div>
              <div><label className="label">Goal (kcal)</label><input type="number" className="input-field" placeholder="2000" onChange={e => set('goal', e.target.value)} /></div>
            </div>
          )}
          {type === 'workout_log' && (
            <div className="space-y-3">
              <div><label className="label">Workout</label><input type="text" className="input-field" placeholder="Morning run, Chest day..." onChange={e => set('workout', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Duration (min)</label><input type="number" className="input-field" placeholder="45" onChange={e => set('duration', e.target.value)} /></div>
                <div><label className="label">Calories burned</label><input type="number" className="input-field" placeholder="300" onChange={e => set('calories', e.target.value)} /></div>
              </div>
            </div>
          )}
          {type === 'progress_update' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Weight (kg)</label><input type="number" className="input-field" placeholder="70" onChange={e => set('weight', e.target.value)} /></div>
              <div><label className="label">Body Fat %</label><input type="number" className="input-field" placeholder="18" onChange={e => set('bodyFat', e.target.value)} /></div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="label">Caption</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="input-field resize-none" rows={3} placeholder="What's on your mind?" maxLength={500} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handlePost} disabled={posting} className="btn-primary w-full flex items-center justify-center gap-2">
            {posting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Posting...</>
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Share with Friends
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const { user } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showShare,   setShowShare]   = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (p = 1, append = false) => {
    try {
      const { data } = await api.get(`/social/feed?page=${p}&limit=10`);
      setPosts(prev => append ? [...prev, ...(data.posts || [])] : (data.posts || []));
      setHasMore((data.posts || []).length === 10);
    } catch { /* silent */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchPosts(next, true);
  };

  const handleDeleted = (id) => setPosts(ps => ps.filter(p => p._id !== id));

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fadeIn">
        <div>
          <h1 className="section-title">Friends Feed</h1>
          <p className="text-sage-600 dark:text-gray-400 text-sm mt-0.5">Share your progress with friends</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/messages" className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Messages
          </Link>
          <Link to="/friends"  className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Friends
          </Link>
          <button onClick={() => setShowShare(true)} className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5">
            <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Share
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="card text-center py-12">
          <UtensilsCrossed className="loading-pulse h-10 w-10 text-sage-500 dark:text-sage-400 mx-auto mb-3" strokeWidth={1.9} aria-hidden="true" />
          <p className="text-sage-500 dark:text-gray-400">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12">
          <MessageCircle className="h-12 w-12 text-sage-500 dark:text-sage-400 mx-auto mb-3" strokeWidth={1.9} aria-hidden="true" />
          <p className="font-medium text-sage-700 dark:text-gray-300 mb-1">Nothing here yet</p>
          <p className="text-sage-400 dark:text-gray-500 text-sm">Add friends and share your progress to get started!</p>
          <Link to="/friends" className="btn-primary mt-4 inline-block">Find Friends</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 stagger-children">
            {posts.map(post => (
              <PostCard key={post._id} post={post} currentUserId={user?._id} onDeleted={handleDeleted} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center pt-2">
              <button onClick={loadMore} disabled={loadingMore} className="btn-secondary px-8">
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {showShare && <ShareForm onClose={() => setShowShare(false)} onPosted={() => fetchPosts(1)} />}
    </div>
  );
}
