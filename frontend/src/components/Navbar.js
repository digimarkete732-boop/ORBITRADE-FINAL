import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, LogOut, Menu, X, ArrowLeftRight, User, Trophy, Wallet, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, token, logout, isDemoMode, toggleAccountMode } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleMode = async () => {
    const res = await toggleAccountMode();
    if (res?.success) {
      toast.success(`Switched to ${res.mode === 'demo' ? 'Demo' : 'Real'} account`);
    }
  };

  const isAdmin = user?.is_admin;

  const navLink = (path, label, testId) => (
    <Link
      to={path}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        location.pathname === path 
          ? 'text-brand bg-brand/10' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      data-testid={testId}
      onClick={() => setMenuOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-app/95 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              <span className="text-brand">O</span>RBITAL
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {token && (
              <>
                {navLink('/dashboard', 'Dashboard', 'nav-dashboard')}
                {navLink('/deposit', 'Deposit', 'nav-deposit')}
                {!isDemoMode && navLink('/withdraw', 'Withdraw', 'nav-withdraw')}
                {navLink('/tournaments', 'Tournaments', 'nav-tournaments')}
                {!isDemoMode && navLink('/affiliate', 'Affiliate', 'nav-affiliate')}
                {isAdmin && navLink('/admin', 'Admin', 'nav-admin')}
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {token ? (
              <>
                {/* Balance & Mode Toggle */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={handleToggleMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isDemoMode 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-buy/10 text-buy border border-buy/20'
                    }`}
                    data-testid="mode-toggle"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    {isDemoMode ? 'DEMO' : 'REAL'}
                  </button>
                  <div className="px-3 py-1.5 rounded-lg bg-panel border border-white/10">
                    <span className="font-mono text-sm font-semibold text-white" data-testid="balance">
                      ${(user?.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Profile */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  data-testid="profile-link"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-brand" />
                  </div>
                  <span className="hidden lg:block text-sm text-white font-medium truncate max-w-[100px]">
                    {user?.full_name?.split(' ')[0] || 'Profile'}
                  </span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  data-testid="logout-btn"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  data-testid="login-link"
                >
                  Login
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-all"
                  data-testid="signup-link"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="mobile-menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-panel border-b border-white/10 p-4 animate-in">
          {token ? (
            <div className="flex flex-col gap-2">
              {/* Mobile Balance */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-app mb-2">
                <span className="text-xs text-gray-500">Balance</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDemoMode ? 'bg-amber-500/20 text-amber-400' : 'bg-buy/20 text-buy'}`}>
                    {isDemoMode ? 'DEMO' : 'REAL'}
                  </span>
                  <span className="font-mono text-white font-semibold">${(user?.balance || 0).toFixed(2)}</span>
                </div>
              </div>
              
              {navLink('/dashboard', 'Dashboard', 'nav-dashboard-mobile')}
              {navLink('/deposit', 'Deposit', 'nav-deposit-mobile')}
              {!isDemoMode && navLink('/withdraw', 'Withdraw', 'nav-withdraw-mobile')}
              {navLink('/tournaments', 'Tournaments', 'nav-tournaments-mobile')}
              {!isDemoMode && navLink('/affiliate', 'Affiliate', 'nav-affiliate-mobile')}
              {navLink('/profile', 'Profile', 'nav-profile-mobile')}
              {isAdmin && navLink('/admin', 'Admin', 'nav-admin-mobile')}
              
              <button
                onClick={handleToggleMode}
                className="w-full mt-2 px-4 py-2.5 rounded-lg bg-white/5 text-white text-sm font-medium text-left flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Switch to {isDemoMode ? 'Real' : 'Demo'} Mode
              </button>
              
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full mt-2 px-4 py-2.5 rounded-lg bg-sell/10 text-sell text-sm font-medium text-left flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-lg text-white text-center font-medium bg-brand">
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
