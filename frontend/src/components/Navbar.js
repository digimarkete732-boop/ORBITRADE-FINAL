import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, LogOut, User, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(balance || 0);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-space/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric to-neon flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-space" />
            </div>
            <span className="font-display font-semibold text-white text-lg">ORBITAL</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={location.pathname === '/dashboard' ? 'nav-link-active' : 'nav-link'}
                  data-testid="nav-dashboard"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/deposit" 
                  className={location.pathname === '/deposit' ? 'nav-link-active' : 'nav-link'}
                  data-testid="nav-deposit"
                >
                  Deposit
                </Link>
                <Link 
                  to="/withdraw" 
                  className={location.pathname === '/withdraw' ? 'nav-link-active' : 'nav-link'}
                  data-testid="nav-withdraw"
                >
                  Withdraw
                </Link>
                <Link 
                  to="/affiliate" 
                  className={location.pathname === '/affiliate' ? 'nav-link-active' : 'nav-link'}
                  data-testid="nav-affiliate"
                >
                  Affiliate
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={location.pathname === '/admin' ? 'nav-link-active' : 'nav-link'}
                    data-testid="nav-admin"
                  >
                    Admin
                  </Link>
                )}
                
                {/* Balance */}
                <div className="px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20">
                  <span className="text-xs text-gray-400">Balance: </span>
                  <span className="font-mono text-sm text-electric" data-testid="nav-balance">
                    {formatBalance(user?.balance)}
                  </span>
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{user?.full_name?.split(' ')[0]}</span>
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/" className={location.pathname === '/' ? 'nav-link-active' : 'nav-link'}>
                  Home
                </Link>
                <Link to="/auth" className="btn-primary text-sm" data-testid="nav-login">
                  Start Trading
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-space-light border-t border-white/5">
          <div className="px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 rounded-lg bg-electric/10 border border-electric/20 mb-4">
                  <span className="text-xs text-gray-400">Balance: </span>
                  <span className="font-mono text-sm text-electric">{formatBalance(user?.balance)}</span>
                </div>
                <Link to="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5">Dashboard</Link>
                <Link to="/deposit" className="block px-3 py-2 rounded-lg hover:bg-white/5">Deposit</Link>
                <Link to="/withdraw" className="block px-3 py-2 rounded-lg hover:bg-white/5">Withdraw</Link>
                <Link to="/affiliate" className="block px-3 py-2 rounded-lg hover:bg-white/5">Affiliate</Link>
                {isAdmin && <Link to="/admin" className="block px-3 py-2 rounded-lg hover:bg-white/5">Admin</Link>}
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-vibrant">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="block px-3 py-2 rounded-lg hover:bg-white/5">Home</Link>
                <Link to="/auth" className="block px-3 py-2 rounded-lg bg-electric text-white text-center">
                  Start Trading
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
