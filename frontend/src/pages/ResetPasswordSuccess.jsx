import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from '../components/OpenMojiIcons';
import BrandLogo from '../components/BrandLogo';

export default function ResetPasswordSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-center gap-2 mb-5">
          <BrandLogo size="md" className="h-[7.03125rem] w-[7.03125rem]" />
          <span className="font-display text-2xl font-semibold text-sage-900 dark:text-white">heAlthy</span>
        </div>
        <div className="card dark:bg-gray-900 dark:border-gray-800 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center justify-center mx-auto mb-4">
            <Check className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Password updated</h1>
          <p className="text-sage-600 dark:text-gray-400 text-sm mt-2">
            Your password was reset successfully. Redirecting you to sign in...
          </p>

          <Link to="/login" className="btn-primary w-full mt-6 inline-flex items-center justify-center">
            Go to Sign in now
          </Link>
        </div>
      </div>
    </div>
  );
}
