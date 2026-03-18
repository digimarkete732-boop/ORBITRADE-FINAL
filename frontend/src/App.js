import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Affiliate from './pages/Affiliate';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-electric border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-electric border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route 
        path="/auth" 
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } 
      />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/deposit" 
        element={
          <ProtectedRoute>
            <Deposit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/deposit/success" 
        element={
          <ProtectedRoute>
            <Deposit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/withdraw" 
        element={
          <ProtectedRoute>
            <Withdraw />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/affiliate" 
        element={
          <ProtectedRoute>
            <Affiliate />
          </ProtectedRoute>
        } 
      />

      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        } 
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-space text-gray-300 font-sans overflow-x-hidden antialiased">
          {/* Ambient Background */}
          <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-electric/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-vibrant/10 rounded-full blur-[150px]"></div>
          </div>
          
          <AppRoutes />
          
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#e5e7eb',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px'
              },
              success: {
                iconTheme: {
                  primary: '#2af5ff',
                  secondary: '#111827'
                }
              },
              error: {
                iconTheme: {
                  primary: '#9d4edd',
                  secondary: '#111827'
                }
              }
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
