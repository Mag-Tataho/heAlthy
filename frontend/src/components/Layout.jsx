import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import {
  Bot,
  LogOut,
  MessageCircle,
  Newspaper,
  Search,
  TrendingUp,
  Users,
  UtensilsCrossed,
  X,
} from './OpenMojiIcons';

const sidebarItems = [
  { to: '/feed',         icon: Newspaper,      label: 'Friends Feed' },
  { to: '/messages',     icon: MessageCircle,  label: 'Messages' },
  { to: '/friends',      icon: Users,          label: 'Friends' },
  { to: '/meal-plans',   icon: UtensilsCrossed,label: 'Meal Plans' },
  { to: '/custom-meals', icon: UtensilsCrossed,label: 'Custom Meals' },
  { to: '/progress',     icon: TrendingUp,     label: 'Progress' },
  { to: '/food-search',  icon: Search,         label: 'Food Search' },
  { to: '/chat',         icon: Bot,            label: 'AI Chat', premium: true },
];

const bottomNavItems = [
  { to: '/feed',       icon: Newspaper,       label: 'Feed' },
  { to: '/meal-plans', icon: UtensilsCrossed, label: 'Meals' },
  { to: '/progress',   icon: TrendingUp,      label: 'Progress' },
  { to: '/friends',    icon: Users,           label: 'Friends' },
  { to: '/chat',       icon: Bot,             label: 'AI', premium: true },
];

function UserAvatar({ user, sizeClass = 'w-9 h-9' }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user?.name || 'User'} profile`}
        className={`${sizeClass} rounded-full object-cover border border-sage-200 dark:border-gray-700 bg-white`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full border border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden`}>
      <BrandLogo size="sm" className="h-6 w-6" />
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="px-6 h-[93px] border-b border-sage-100 dark:border-gray-800 flex items-center">
        <button
          onClick={() => {
            navigate('/dashboard');
            setSidebarOpen(false);
          }}
          className="w-full max-w-[13rem] mx-auto grid grid-cols-[2.75rem_auto] items-center justify-center gap-2.5 py-1"
        >
          <span className="w-11 h-11 rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0 -translate-y-px">
            <BrandLogo size="md" className="h-20 w-20 scale-[1.85] -translate-y-[1px]" />
          </span>
          <span className="font-display text-[2.1rem] leading-[1] font-semibold text-sage-900 dark:text-white -translate-y-[1px]">heAlthy</span>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sage-600 text-white shadow-sm'
                    : 'text-sage-700 dark:text-gray-300 hover:bg-sage-100 dark:hover:bg-gray-800 hover:text-sage-900 dark:hover:text-white'
                } ${item.premium && !user?.isPremium ? 'opacity-60' : ''}`
              }
            >
              <span className="text-base">
                <Icon className="h-4 w-4 stroke-[2]" aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {item.premium && !user?.isPremium && (
                <span className="ml-auto text-xs text-amber-500 font-medium">PRO</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Upgrade CTA for free users */}
      {!user?.isPremium && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-amber-50 to-sage-50 rounded-xl border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">Upgrade to Premium</p>
          <p className="text-xs text-sage-600 dark:text-gray-400 mb-3">Unlock personalized plans, AI chat & more</p>
          <NavLink
            to="/profile"
            className="block text-center text-xs font-medium bg-amber-400 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition-colors"
          >
            Upgrade Now
          </NavLink>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-cream dark:bg-gray-950 overflow-hidden">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-sage-100 dark:border-gray-800 flex-shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── MOBILE SLIDE-OUT DRAWER ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-72 bg-white dark:bg-gray-900 h-full shadow-2xl animate-slideIn overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-sage-100 dark:bg-gray-700 text-sage-600 dark:text-gray-400 hover:bg-sage-200 transition-colors"
            >
              <X className="h-4 w-4 stroke-[2]" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-end px-6 h-[93px] bg-white dark:bg-gray-900 border-b border-sage-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sage-50 dark:hover:bg-gray-800 transition-colors"
            >
              <UserAvatar user={user} sizeClass="w-10 h-10" />
              <div className="text-left">
                <p className="text-sm font-medium text-sage-900 dark:text-white leading-tight">{user?.name}</p>
                <p className="text-xs text-sage-500 dark:text-gray-400">Profile & Settings</p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-sage-100 dark:border-gray-800 safe-area-top">
          {/* Left: menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-50 dark:bg-gray-800 hover:bg-sage-100 text-sage-700 dark:text-gray-200 transition-colors"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="12" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="15" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Center: logo */}
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5">
            <span className="w-9 h-9 rounded-sm overflow-hidden flex items-center justify-center">
              <BrandLogo size="sm" className="h-16 w-16 scale-[1.8]" />
            </span>
            <span className="font-display font-semibold text-sage-900 dark:text-white text-lg">heAlthy</span>
          </button>

          {/* Right: profile + logout */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')} className="rounded-full">
              <UserAvatar user={user} sizeClass="w-9 h-9" />
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4 stroke-[2]" aria-hidden="true" />
            </button>
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
              const Icon = item.icon;

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
                    } ${isActive ? 'text-sage-700 dark:text-white' : 'text-sage-500 dark:text-gray-400'} ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <Icon className="h-5 w-5 stroke-[2]" aria-hidden="true" />
                  </span>

                  {/* Label */}
                  <span
                    className={`text-xs font-medium transition-colors duration-200 ${
                      isActive ? 'text-sage-700 dark:text-white' : 'text-sage-400 dark:text-gray-500'
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
