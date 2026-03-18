import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, Bitcoin, Building2, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const Withdraw = () => {
  const { user, refreshUser } = useAuth();
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState(100);
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  
  useEffect(() => {
    fetchWithdrawals();
  }, []);
  
  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/api/withdrawals');
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };
  
  const handleWithdraw = async () => {
    if (amount < 10) {
      toast.error('Minimum withdrawal is $10');
      return;
    }
    
    if (amount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (method === 'crypto' && !walletAddress) {
      toast.error('Please enter your wallet address');
      return;
    }
    
    setLoading(true);
    
    try {
      await api.post('/api/withdrawals', {
        amount: parseFloat(amount),
        currency: 'USD',
        method,
        wallet_address: method === 'crypto' ? walletAddress : null
      });
      
      toast.success('Withdrawal request submitted!');
      await refreshUser();
      await fetchWithdrawals();
      setAmount(100);
      setWalletAddress('');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit withdrawal';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col pt-16" data-testid="withdraw-page">
      <Navbar />
      
      <main className="flex-grow p-4 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-semibold text-white mb-2">Withdraw Funds</h1>
          <p className="text-gray-400 mb-8">Request a withdrawal from your account</p>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Withdrawal Form */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-gray-400">Available Balance</span>
                <span className="font-mono text-xl text-white">${(user?.balance || 0).toFixed(2)}</span>
              </div>
              
              {/* Method Selection */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    method === 'bank'
                      ? 'bg-electric/20 text-electric border border-electric/30'
                      : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setMethod('bank')}
                >
                  <Building2 className="w-5 h-5" />
                  Bank
                </button>
                <button
                  className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    method === 'crypto'
                      ? 'bg-electric/20 text-electric border border-electric/30'
                      : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setMethod('crypto')}
                >
                  <Bitcoin className="w-5 h-5" />
                  Crypto
                </button>
                <button
                  className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    method === 'paypal'
                      ? 'bg-electric/20 text-electric border border-electric/30'
                      : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setMethod('paypal')}
                >
                  <CreditCard className="w-5 h-5" />
                  PayPal
                </button>
              </div>
              
              {/* Amount */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                    className="input-field pl-8 text-lg font-mono"
                    min="10"
                    max={user?.balance || 0}
                    data-testid="withdraw-amount"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <button 
                    className="text-xs text-electric"
                    onClick={() => setAmount(Math.floor((user?.balance || 0) / 2))}
                  >
                    50%
                  </button>
                  <button 
                    className="text-xs text-electric"
                    onClick={() => setAmount(user?.balance || 0)}
                  >
                    Max
                  </button>
                </div>
              </div>
              
              {/* Crypto Address */}
              {method === 'crypto' && (
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">Wallet Address</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="input-field font-mono text-sm"
                    placeholder="Enter your BTC/ETH/USDT address"
                    data-testid="wallet-address"
                  />
                </div>
              )}
              
              {/* Fee Info */}
              <div className="p-3 rounded-lg bg-space-light border border-white/5 mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Withdrawal Amount</span>
                  <span className="text-white">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Processing Fee</span>
                  <span className="text-white">$0.00</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                  <span className="text-gray-400">You'll Receive</span>
                  <span className="text-neon font-medium">${amount.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={loading || amount < 10 || amount > (user?.balance || 0)}
                className="btn-primary w-full flex items-center justify-center gap-2"
                data-testid="withdraw-submit"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Request Withdrawal
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Withdrawals are processed within 24-48 hours
              </p>
            </div>
            
            {/* Withdrawal History */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Recent Withdrawals</h3>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No withdrawal history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.slice(0, 5).map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-space-light">
                      <div>
                        <div className="text-sm text-white">${w.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{formatDate(w.created_at)}</div>
                      </div>
                      <span className={`badge ${
                        w.status === 'approved' ? 'badge-success' :
                        w.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Warning */}
          <div className="mt-6 p-4 rounded-lg bg-amber/5 border border-amber/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white">Important Notice</p>
                <p className="text-xs text-gray-400 mt-1">
                  All withdrawal requests are subject to verification. Please ensure your KYC documents are up to date to avoid delays.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Withdraw;
