import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const STEPS = ['Account', 'Body Info', 'Goals', 'Preferences'];

const GOALS = [
  { value: 'lose_weight',    label: '🏃 Lose Weight',     desc: 'Reduce body fat' },
  { value: 'maintain',       label: '⚖️ Maintain Weight',  desc: 'Stay at current weight' },
  { value: 'gain_muscle',    label: '💪 Gain Muscle',      desc: 'Build lean mass' },
  { value: 'improve_health', label: '🌿 Improve Health',   desc: 'Feel better overall' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',          desc: 'Little to no exercise' },
  { value: 'light',       label: 'Lightly Active',     desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderately Active',  desc: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',        desc: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active',   desc: 'Intense daily exercise' },
];

export default function Register() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    // Step 0 — Account
    name: '', email: '', password: '', confirm: '',
    // Step 1 — Body Info
    age: '', gender: '', height: '', weight: '', targetWeight: '',
    // Step 2 — Goals
    goal: 'maintain', activityLevel: 'moderate',
    // Step 3 — Preferences
    allergies: '', dietaryRestrictions: '', cuisinePreferences: '',
    budget: '', budgetAmount: '', budgetPeriod: 'week', currency: 'PHP',
  });

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError('');
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return 'Name is required';
      if (!form.email.trim()) return 'Email is required';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
      if (form.password !== form.confirm) return 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.age || form.age < 1) return 'Please enter your age';
      if (!form.gender) return 'Please select your gender';
      if (!form.height) return 'Please enter your height';
      if (!form.weight) return 'Please enter your weight';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) return setError(err);
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Register
      const { data: regData } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      localStorage.setItem('token', regData.token);

      // Save profile
      const profile = {
        age: parseInt(form.age) || undefined,
        gender: form.gender || undefined,
        height: parseFloat(form.height) || undefined,
        weight: parseFloat(form.weight) || undefined,
        targetWeight: parseFloat(form.targetWeight) || undefined,
        goal: form.goal,
        activityLevel: form.activityLevel,
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        dietaryRestrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        cuisinePreferences: form.cuisinePreferences ? form.cuisinePreferences.split(',').map((s) => s.trim()).filter(Boolean) : [],
        budget: form.budget || 'moderate',
        budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : undefined,
        budgetPeriod: form.budgetPeriod,
        currency: form.currency,
      };

      await api.put('/profile', { profile });

      // Login to set user in context
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < step ? 'bg-sage-600 text-white' :
              i === step ? 'bg-sage-600 text-white ring-4 ring-sage-200 dark:ring-sage-900' :
              'bg-sage-100 dark:bg-gray-800 text-sage-400 dark:text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-sage-700 dark:text-sage-300' : 'text-sage-400 dark:text-gray-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 max-w-8 rounded transition-all duration-300 ${i < step ? 'bg-sage-500' : 'bg-sage-100 dark:bg-gray-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fadeIn">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="text-2xl">🌿</span>
          <span className="font-display text-xl font-semibold text-sage-900 dark:text-white">heAlthy</span>
        </div>

        <div className="card dark:bg-gray-900 dark:border-gray-800">
          <StepIndicator />

          {/* STEP 0 — Account */}
          {step === 0 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Create your account</h2>
                <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Start your health journey today — free forever</p>
              </div>
              <div>
                <label className="label">Full name</label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="Your full name" />
              </div>
              <div>
                <label className="label">Email address</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input-field" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} className="input-field" placeholder="Repeat password" />
              </div>
            </div>
          )}

          {/* STEP 1 — Body Info */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Your body info</h2>
                <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Used to calculate your personalized calorie targets</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Age</label>
                  <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} className="input-field" placeholder="e.g. 22" min="1" max="120" />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input type="number" value={form.height} onChange={(e) => set('height', e.target.value)} className="input-field" placeholder="e.g. 165" />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} className="input-field" placeholder="e.g. 65" />
                </div>
              </div>
              <div>
                <label className="label">Target weight (kg) <span className="text-sage-400 font-normal">— optional</span></label>
                <input type="number" value={form.targetWeight} onChange={(e) => set('targetWeight', e.target.value)} className="input-field" placeholder="e.g. 60" />
              </div>
            </div>
          )}

          {/* STEP 2 — Goals */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Your goals</h2>
                <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">What are you aiming for?</p>
              </div>
              <div>
                <label className="label">Primary goal</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => set('goal', g.value)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        form.goal === g.value
                          ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500'
                          : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-sage-900 dark:text-white">{g.label}</p>
                      <p className="text-xs text-sage-400 dark:text-gray-500 mt-0.5">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Activity level</label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => set('activityLevel', a.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all duration-200 ${
                        form.activityLevel === a.value
                          ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500'
                          : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
                      }`}
                    >
                      <span className="font-medium text-sage-900 dark:text-white">{a.label}</span>
                      <span className="text-sage-400 dark:text-gray-500 text-xs">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Preferences */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Food preferences</h2>
                <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Help us personalize your meal plans (all optional)</p>
              </div>

              {/* Budget section */}
              <div className="p-4 bg-sage-50 dark:bg-gray-800 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-sage-700 dark:text-sage-300">💰 Food Budget</p>
                <div className="flex gap-2">
                  {['PHP', 'USD'].map((c) => (
                    <button key={c} type="button" onClick={() => set('currency', c)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${form.currency === c ? 'bg-sage-600 text-white' : 'bg-white dark:bg-gray-700 border border-sage-200 dark:border-gray-600 text-sage-600 dark:text-gray-300'}`}>
                      {c === 'PHP' ? '₱ PHP' : '$ USD'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label text-xs">Amount ({form.currency === 'PHP' ? '₱' : '$'})</label>
                    <input type="number" value={form.budgetAmount} onChange={(e) => set('budgetAmount', e.target.value)}
                      className="input-field" placeholder={form.currency === 'PHP' ? 'e.g. 500' : 'e.g. 50'} />
                  </div>
                  <div className="flex-1">
                    <label className="label text-xs">Per</label>
                    <select value={form.budgetPeriod} onChange={(e) => set('budgetPeriod', e.target.value)} className="input-field">
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Allergies <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                <input type="text" value={form.allergies} onChange={(e) => set('allergies', e.target.value)}
                  className="input-field" placeholder="e.g. nuts, shellfish, dairy" />
              </div>
              <div>
                <label className="label">Dietary restrictions <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                <input type="text" value={form.dietaryRestrictions} onChange={(e) => set('dietaryRestrictions', e.target.value)}
                  className="input-field" placeholder="e.g. vegetarian, gluten-free, halal" />
              </div>
              <div>
                <label className="label">Cuisine preferences <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                <input type="text" value={form.cuisinePreferences} onChange={(e) => set('cuisinePreferences', e.target.value)}
                  className="input-field" placeholder="e.g. Filipino, Asian, Mediterranean" />
              </div>

            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep} className="btn-primary flex-1">
                Next →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
                ) : '🚀 Create My Account'}
              </button>
            )}
          </div>

          {step === STEPS.length - 1 && (
            <p className="text-center text-xs text-sage-400 dark:text-gray-500 mt-3">
              You can always update these later in your profile
            </p>
          )}
        </div>

        <p className="text-center text-sage-600 dark:text-gray-400 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-sage-700 dark:text-sage-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
