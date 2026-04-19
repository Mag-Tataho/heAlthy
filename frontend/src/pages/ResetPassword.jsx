import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import BrandLogo from '../components/BrandLogo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const otpRefs = useRef([]);
  const steps = ['Request', 'OTP', 'New Password'];

  const code = otpDigits.join('');

  const handleOtpChange = (index, value) => {
    const digit = String(value).replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    event.preventDefault();
    const updated = Array(6).fill('');
    pasted.split('').forEach((digit, index) => {
      updated[index] = digit;
    });
    setOtpDigits(updated);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResend = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Enter your email first before requesting another code.');
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If your email exists, a new OTP code has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Email is required.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-reset-code', {
        email,
        code,
      });
      navigate('/reset-password/new', {
        replace: true,
        state: {
          email: String(email).trim().toLowerCase(),
          code,
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to verify code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-cream dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(116,160,114,0.22),transparent_35%),radial-gradient(circle_at_90%_88%,rgba(61,107,61,0.16),transparent_35%)]" />

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
                      index <= 1
                        ? 'bg-sage-600 text-white ring-4 ring-sage-100 dark:ring-sage-900/40'
                        : 'bg-sage-100 dark:bg-gray-800 text-sage-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      index === 1 ? 'text-sage-700 dark:text-sage-300' : 'text-sage-400 dark:text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <span className={`w-6 h-0.5 rounded-full ${index === 0 ? 'bg-sage-400' : 'bg-sage-200 dark:bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 flex items-center justify-center text-3xl mx-auto mb-4">
            🔢
          </div>
          <h1 className="font-display text-2xl font-semibold text-sage-900 dark:text-white text-center">Enter 6 Digit OTP</h1>
          <p className="text-sage-600 dark:text-gray-400 text-sm mt-1 mb-6 text-center">
            Enter the verification code sent to your email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm">
                {message}
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

            <div>
              <label className="label">6-digit OTP code</label>
              <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={`otp-${index}`}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-12 text-center text-lg font-semibold rounded-xl border border-sage-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sage-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sage-400"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="one-time-code"
                    required
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying code...
                </>
              ) : (
                'Verify code'
              )}
            </button>

            <div className="flex items-center justify-between text-sm text-sage-500 dark:text-gray-400 pt-1">
              <span>Didn't receive a code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-sage-700 dark:text-sage-300 hover:underline disabled:opacity-60"
              >
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-sm text-sage-700 dark:text-gray-300 bg-sage-50 dark:bg-gray-800 border border-sage-200 dark:border-gray-700 rounded-xl p-3">
            Need to start again? <Link to="/forgot-password" className="font-medium hover:underline">Request a new OTP</Link>.
          </div>
        </div>

        <p className="text-center text-sage-600 dark:text-gray-400 text-sm mt-4">
          Return to{' '}
          <Link to="/login" className="text-sage-700 dark:text-sage-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
