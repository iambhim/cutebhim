import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

// Lazy load pages
const Splash = lazy(() => import('./pages/Splash'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Reels = lazy(() => import('./pages/Reels'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Search = lazy(() => import('./pages/Search'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const CreateStory = lazy(() => import('./pages/CreateStory'));

// Loading fallback
const LoadingFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'var(--bg-primary)',
    flexDirection: 'column', gap: '16px',
  }}>
    <div style={{
      width: 50, height: 50, borderRadius: '14px',
      background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
        <path d="M22 22 C16 16 8 14 8 20 C8 26 16 26 22 22Z" fill="rgba(255,255,255,0.9)" />
        <path d="M22 22 C28 16 36 14 36 20 C36 26 28 26 22 22Z" fill="rgba(255,255,255,0.9)" />
        <path d="M22 22 C16 28 14 36 20 36 C26 36 26 28 22 22Z" fill="rgba(255,255,255,0.7)" />
        <path d="M22 22 C28 28 30 36 24 36 C18 36 18 28 22 22Z" fill="rgba(255,255,255,0.7)" />
        <circle cx="22" cy="22" r="4" fill="white" />
      </svg>
    </div>
    <div style={{ width: 32, height: 32, border: '3px solid rgba(108,99,255,0.2)', borderTopColor: '#6C63FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Public route (redirect if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (currentUser) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Splash */}
        <Route path="/" element={<Splash />} />

        {/* Auth routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
        <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              {userProfile?.isAdmin ? <Admin /> : <Navigate to="/home" replace />}
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              },
              success: {
                iconTheme: { primary: '#6C63FF', secondary: 'white' },
              },
              error: {
                iconTheme: { primary: '#FF6584', secondary: 'white' },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
