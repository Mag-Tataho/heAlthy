import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toggleTheme, effectiveTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex transition-colors duration-200">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sage-700 dark:bg-sage-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #a0c09e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #74a072 0%, transparent 50%)' }} />
        <div className="relative z-10 text-center text-white max-w-sm">
          <div className="text-7xl mb-6">🌿</div>
          <h1 className="font-display text-4xl font-bold mb-4 leading-tight">Eat Smart,<br />Live heAlthy</h1>
          <p className="text-sage-200 text-lg leading-relaxed">AI-powered personalized diet plans tailored to your goals, preferences, and lifestyle.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-medium">
            {['🥗 AI Plans', '📊 Progress', '💬 AI Coach'].map((item) => (
              <div key={item} className="bg-white/10 rounded-xl p-3">{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-sage-50 dark:bg-gray-800 flex items-center justify-center hover:bg-sage-100 dark:hover:bg-gray-700 transition-colors text-lg">
          {effectiveTheme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="w-full max-w-md animate-fadeIn">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-2xl">🌿</span>
            <span className="font-display text-xl font-semibold text-sage-900 dark:text-white">heAlthy</span>
          </div>

          <h2 className="font-display text-3xl font-semibold text-sage-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sage-600 dark:text-gray-400 mb-8">Sign in to continue your health journey</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Your password" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-sage-50 dark:bg-gray-800 rounded-xl border border-sage-100 dark:border-gray-700">
            <p className="text-xs text-sage-600 dark:text-gray-400 font-medium mb-2">🧪 Demo accounts:</p>
            <div className="space-y-1 text-xs text-sage-500 dark:text-gray-500">
              <p><strong>Free:</strong> free@test.com / password123</p>
              <p><strong>Premium:</strong> premium@test.com / password123</p>
            </div>
          </div>

          <p className="mt-5 text-center text-sage-600 dark:text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-sage-700 dark:text-sage-400 font-medium hover:underline">Sign up free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
