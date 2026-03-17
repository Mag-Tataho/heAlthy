import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Defined OUTSIDE component so React never remounts them ──
const GOALS = [
  { value: 'lose_weight',    label: '🏃 Lose Weight' },
  { value: 'maintain',       label: '⚖️ Maintain Weight' },
  { value: 'gain_muscle',    label: '💪 Gain Muscle' },
  { value: 'improve_health', label: '🌿 Improve Health' },
];
const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',         desc: 'Little/no exercise' },
  { value: 'light',       label: 'Lightly Active',    desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active',  desc: 'Intense daily' },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const p = user?.profile || {};

  const [profile, setProfile] = useState({
    age:                 p.age || '',
    gender:              p.gender || '',
    height:              p.height || '',
    weight:              p.weight || '',
    targetWeight:        p.targetWeight || '',
    activityLevel:       p.activityLevel || 'moderate',
    goal:                p.goal || 'maintain',
    allergies:           p.allergies?.join(', ') || '',
    dietaryRestrictions: p.dietaryRestrictions?.join(', ') || '',
    cuisinePreferences:  p.cuisinePreferences?.join(', ') || '',
  });

  const [privacy, setPrivacy] = useState(user?.privacy || {
    showProgress: true,
    showProfile:  true,
    showGoal:     true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => { setProfile(prev => ({ ...prev, [k]: v })); setSuccess(false); };

  const handlePrivacyChange = async (key) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    setSavingPrivacy(true);
    try {
      const { data } = await api.put('/profile/privacy', { privacy: updated });
      updateUser(data.user);
    } catch { setPrivacy(privacy); }
    finally { setSavingPrivacy(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        age:                 profile.age          ? parseInt(profile.age)            : undefined,
        gender:              profile.gender        || undefined,
        height:              profile.height        ? parseFloat(profile.height)       : undefined,
        weight:              profile.weight        ? parseFloat(profile.weight)       : undefined,
        targetWeight:        profile.targetWeight  ? parseFloat(profile.targetWeight) : undefined,
        activityLevel:       profile.activityLevel,
        goal:                profile.goal,
        allergies:           profile.allergies           ? profile.allergies.split(',').map(s => s.trim()).filter(Boolean)           : [],
        dietaryRestrictions: profile.dietaryRestrictions ? profile.dietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
        cuisinePreferences:  profile.cuisinePreferences  ? profile.cuisinePreferences.split(',').map(s => s.trim()).filter(Boolean)  : [],
      };
      const { data } = await api.put('/profile', { profile: payload });
      updateUser(data.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally { setSaving(false); }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-fadeIn">
        <h1 className="section-title">My Profile</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">Keep your info updated for accurate meal plans</p>
      </div>

      {success && <div className="p-3 bg-sage-50 dark:bg-sage-900/30 border border-sage-300 dark:border-sage-700 rounded-xl text-sage-700 dark:text-sage-300 text-sm text-center animate-fadeIn">✅ Profile saved!</div>}
      {error   && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Body Info */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">📏 Body Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Age</label>
              <input type="number" value={profile.age} onChange={e => set('age', e.target.value)}
                className="input-field" placeholder="e.g. 22" min="1" max="120" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={profile.gender} onChange={e => set('gender', e.target.value)} className="input-field">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" value={profile.height} onChange={e => set('height', e.target.value)}
                className="input-field" placeholder="e.g. 165" min="0" />
            </div>
            <div>
              <label className="label">Current Weight (kg)</label>
              <input type="number" value={profile.weight} onChange={e => set('weight', e.target.value)}
                className="input-field" placeholder="e.g. 65" min="0" step="0.1" />
            </div>
            <div className="col-span-2">
              <label className="label">Target Weight (kg) <span className="font-normal text-sage-400">optional</span></label>
              <input type="number" value={profile.targetWeight} onChange={e => set('targetWeight', e.target.value)}
                className="input-field" placeholder="e.g. 60" min="0" step="0.1" />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">🎯 Goals</h2>
          <div className="mb-4">
            <label className="label">Primary Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button key={g.value} type="button" onClick={() => set('goal', g.value)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${profile.goal === g.value ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.value} type="button" onClick={() => set('activityLevel', a.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${profile.activityLevel === a.value ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'}`}>
                  <span className="font-medium text-sage-900 dark:text-white">{a.label}</span>
                  <span className="text-sage-400 dark:text-gray-500 text-xs">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>



        {/* Preferences */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">🍽️ Food Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Allergies <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.allergies} onChange={e => set('allergies', e.target.value)}
                className="input-field" placeholder="e.g. nuts, shellfish, dairy" />
            </div>
            <div>
              <label className="label">Dietary Restrictions <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.dietaryRestrictions} onChange={e => set('dietaryRestrictions', e.target.value)}
                className="input-field" placeholder="e.g. vegetarian, gluten-free, halal" />
            </div>
            <div>
              <label className="label">Cuisine Preferences <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.cuisinePreferences} onChange={e => set('cuisinePreferences', e.target.value)}
                className="input-field" placeholder="e.g. Filipino, Asian, Mediterranean" />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-1">🔒 Privacy Settings</h2>
          <p className="text-xs text-sage-400 dark:text-gray-500 mb-4">Control what your friends can see on your profile</p>
          {[
            { key: 'showProgress', label: '📊 Show Progress to Friends', desc: 'Friends can see your weight, calories and workout logs' },
            { key: 'showProfile',  label: '👤 Show Profile Details',     desc: 'Friends can see your body info and goals' },
            { key: 'showGoal',     label: '🎯 Show Health Goal',         desc: 'Friends can see your health goal (e.g. Lose Weight)' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-sage-50 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-sage-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button type="button" onClick={() => handlePrivacyChange(key)}
                className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center flex-shrink-0 ${privacy[key] ? 'bg-sage-600 justify-end' : 'bg-sage-200 dark:bg-gray-700 justify-start'}`}>
                <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 block" />
              </button>
            </div>
          ))}
          {savingPrivacy && <p className="text-xs text-sage-400 mt-2 text-center">Saving privacy settings...</p>}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : '💾 Save Profile'}
        </button>
      </form>
    </div>
  );
}
