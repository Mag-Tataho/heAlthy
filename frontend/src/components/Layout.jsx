import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Desktop sidebar — all items
const sidebarItems = [
  { to: '/dashboard',    icon: '🏠', label: 'Dashboard' },
  { to: '/feed',         icon: '📱', label: 'Friends Feed' },
  { to: '/messages',     icon: '💬', label: 'Messages' },
  { to: '/friends',      icon: '👥', label: 'Friends' },
  { to: '/meal-plans',   icon: '🥗', label: 'Meal Plans' },
  { to: '/custom-meals', icon: '🍽️', label: 'Custom Meals' },
  { to: '/progress',     icon: '📈', label: 'Progress' },
  { to: '/food-search',  icon: '🔍', label: 'Food Search' },
  { to: '/chat',         icon: '💬', label: 'AI Chat', premium: true },
  { to: '/profile',      icon: '👤', label: 'Profile' },
  { to: '/settings',     icon: '⚙️', label: 'Settings' },
];

// Mobile bottom nav — 5 most important items
const bottomNavItems = [
  { to: '/dashboard',  icon: '🏠', label: 'Home' },
  { to: '/feed',       icon: '📱', label: 'Feed' },
  { to: '/meal-plans', icon: '🥗', label: 'Meals' },
  { to: '/progress',   icon: '📈', label: 'Progress' },
  { to: '/profile',    icon: '👤', label: 'Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { toggleTheme, effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sage-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-display text-xl font-semibold text-sage-900">heAlthy</span>
        </div>
        <p className="text-xs text-sage-500 mt-1 font-body">Smart diet planning</p>
      </div>

      {/* User badge */}
      <div className="px-6 py-4 border-b border-sage-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sage-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sage-900 truncate">{user?.name}</p>
            <span className={user?.isPremium ? 'badge-premium' : 'badge-free'}>
              {user?.isPremium ? '✨ Premium' : '🌱 Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sage-600 text-white shadow-sm'
                  : 'text-sage-700 hover:bg-sage-100 hover:text-sage-900'
              } ${item.premium && !user?.isPremium ? 'opacity-60' : ''}`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
            {item.premium && !user?.isPremium && (
              <span className="ml-auto text-xs text-amber-500 font-medium">PRO</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Upgrade CTA for free users */}
      {!user?.isPremium && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-amber-50 to-sage-50 rounded-xl border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">✨ Upgrade to Premium</p>
          <p className="text-xs text-sage-600 mb-3">Unlock personalized plans, AI chat & more</p>
          <NavLink
            to="/settings"
            className="block text-center text-xs font-medium bg-amber-400 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition-colors"
          >
            Upgrade Now
          </NavLink>
        </div>
      )}

      {/* Theme toggle + Logout */}
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sage-600 dark:text-gray-400 hover:bg-sage-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <span>{effectiveTheme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{effectiveTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sage-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <span>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-cream overflow-hidden">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-sage-100 dark:border-gray-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── MOBILE SLIDE-OUT DRAWER (for extra pages like Food Search, Settings) ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-72 bg-white dark:bg-gray-900 h-full shadow-2xl animate-slideIn">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-sage-100 text-sage-600 hover:bg-sage-200 transition-colors"
            >
              ✕
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-sage-100 dark:border-gray-800 safe-area-top">
          {/* Left: menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-50 hover:bg-sage-100 text-sage-700 transition-colors"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="12" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="15" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Center: logo */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🌿</span>
            <span className="font-display font-semibold text-sage-900 text-lg">heAlthy</span>
          </div>

          {/* Right: avatar + premium badge */}
          <div className="flex items-center gap-2">
            {user?.isPremium && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ✨
              </span>
            )}
            <div className="w-9 h-9 rounded-full bg-sage-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for the nav bar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-sage-100 dark:border-gray-800 safe-area-bottom"
          style={{ boxShadow: effectiveTheme === 'dark' ? '0 -4px 24px rgba(0,0,0,0.4)' : '0 -4px 24px rgba(0,0,0,0.07)' }}
        >
          <div className="flex items-stretch">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              const isLocked = item.premium && !user?.isPremium;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex-1 flex flex-col items-center justify-center py-2 px-1 relative transition-all duration-200 active:scale-95"
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-sage-600 rounded-b-full" />
                  )}

                  {/* Icon with active bg */}
                  <span
                    className={`text-xl mb-0.5 transition-all duration-200 ${
                      isActive ? 'scale-110' : 'scale-100'
                    } ${isLocked ? 'opacity-50' : ''}`}
                  >
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span
                    className={`text-xs font-medium transition-colors duration-200 ${
                      isActive ? 'text-sage-700' : 'text-sage-400'
                    } ${isLocked ? 'opacity-50' : ''}`}
                  >
                    {item.label}
                  </span>

                  {/* PRO badge for locked items */}
                  {isLocked && (
                    <span className="absolute top-1 right-1 text-[9px] font-bold text-amber-500 bg-amber-50 px-1 rounded-full leading-tight">
                      PRO
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Safe area spacer for iPhones with home indicator */}
          <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
        </nav>

      </div>
    </div>
  );
}
