import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Landing        from './pages/Landing';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Profile        from './pages/Profile';
import MealPlans      from './pages/MealPlans';
import MealPlanDetail from './pages/MealPlanDetail';
import Progress       from './pages/Progress';
import Chat           from './pages/Chat';
import FoodSearch     from './pages/FoodSearch';
import Settings       from './pages/Settings';
import CustomMeals    from './pages/CustomMeals';
import Friends        from './pages/Friends';
import Feed           from './pages/Feed';
import Messages       from './pages/Messages';
import Layout         from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center">
    <div className="text-center animate-fadeIn">
      <div className="w-12 h-12 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sage-600 dark:text-gray-400">Loading heAlthy...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/"         element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"       element={<Dashboard />} />
        <Route path="profile"         element={<Profile />} />
        <Route path="meal-plans"      element={<MealPlans />} />
        <Route path="meal-plans/:id"  element={<MealPlanDetail />} />
        <Route path="progress"        element={<Progress />} />
        <Route path="chat"            element={<Chat />} />
        <Route path="food-search"     element={<FoodSearch />} />
        <Route path="settings"        element={<Settings />} />
        <Route path="custom-meals"    element={<CustomMeals />} />
        <Route path="friends"         element={<Friends />} />
        <Route path="feed"            element={<Feed />} />
        <Route path="messages"        element={<Messages />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
