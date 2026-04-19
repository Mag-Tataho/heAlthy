import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const steps = ['Request', 'OTP', 'New Password'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      navigate('/reset-password', {
        replace: true,
        state: { email: String(email).trim().toLowerCase() },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-cream dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(116,160,114,0.22),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(61,107,61,0.16),transparent_35%)]" />

      <div className="relative w-full max-w-md animate-fadeIn">
        <div className="flex items-center gap-2 mb-5 justify-center">
          <BrandLogo size="md" className="h-[7.03125rem] w-[7.03125rem]" />
          <span className="font-display text-2xl font-semibold text-sage-900 dark:text-white">heAlthy</span>
        </div>

        <div className="rounded-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-sage-200 dark:border-gray-800 shadow-xl p-6 md:p-7">
          <div className="flex items-center justify-center gap-1 mb-6">
            {steps.map((label, index) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1 min-w-[70px]">
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${
                      index === 0
                        ? 'bg-sage-600 text-white ring-4 ring-sage-100 dark:ring-sage-900/40'
                        : 'bg-sage-100 dark:bg-gray-800 text-sage-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      index === 0 ? 'text-sage-700 dark:text-sage-300' : 'text-sage-400 dark:text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <span className="w-6 h-0.5 rounded-full bg-sage-200 dark:bg-gray-700" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 flex items-center justify-center text-3xl mx-auto mb-4">
            📧
          </div>
          <h1 className="font-display text-2xl font-semibold text-sage-900 dark:text-white text-center">Forgot Password?</h1>
          <p className="text-sage-600 dark:text-gray-400 text-sm mt-1 mb-6 text-center">
            Enter your account email and we will send your 6-digit OTP code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending request code...
                </>
              ) : (
                'Send request code'
              )}
            </button>

            <p className="text-xs text-sage-500 dark:text-gray-400 text-center">
              For security, we only send OTP codes to registered emails.
            </p>
          </form>
        </div>

        <p className="text-center text-sage-600 dark:text-gray-400 text-sm mt-4">
          Back to{' '}
          <Link to="/login" className="text-sage-700 dark:text-sage-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
