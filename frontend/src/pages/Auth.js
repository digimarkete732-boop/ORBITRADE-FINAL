import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.email, formData.password, formData.full_name);
        toast.success('Account created! Welcome to ORBITAL!');
      }
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="flex-grow flex items-center justify-center px-4 relative py-20">
        {/* 3D Geometric Floaters */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden perspective-1000">
          <motion.div 
            className="absolute top-[20%] left-[20%] w-32 h-32 bg-vibrant/20 backdrop-blur-xl rounded-2xl"
            style={{ transform: 'rotate(12deg)' }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute bottom-[20%] right-[20%] w-24 h-24 bg-electric/20 backdrop-blur-xl rounded-full"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        <motion.div 
          className="w-full max-w-md glass-panel rounded-2xl p-8 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Toggle */}
          <div className="flex p-1 bg-space-light rounded-lg mb-8 border border-white/5">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setIsLogin(true)}
              data-testid="login-tab"
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setIsLogin(false)}
              data-testid="register-tab"
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <motion.div 
                className="space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="text-xs text-gray-400 ml-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="input-field pl-9" 
                    placeholder="John Doe"
                    required={!isLogin}
                    data-testid="fullname-input"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 ml-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-9" 
                  placeholder="name@example.com"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs text-gray-400">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs text-electric hover:text-neon transition-colors">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-9 pr-10" 
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-neon text-space font-semibold text-sm 
                       hover:shadow-[0_0_20px_rgba(42,245,255,0.3)] transition-all transform hover:scale-[1.02] 
                       active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-space border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Access Platform' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-gray-500">Or continue with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button 
                type="button" 
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </button>
            </div>
          </form>

          {/* Risk Warning */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms of Service and acknowledge our Risk Disclosure.
          </p>
        </motion.div>
      </section>
    </div>
  );
};

export default Auth;
