import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Bitcoin, Building2, Check, ArrowRight, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const Deposit = () => {
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [method, setMethod] = useState('stripe');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [cryptoAddress, setCryptoAddress] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  
  const presetAmounts = [50, 100, 250, 500, 1000];
  
  // Check for Stripe return
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);
  
  const checkPaymentStatus = async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;
    
    const pollStatus = async () => {
      try {
        const response = await api.get(`/api/deposits/stripe/status/${sessionId}`);
        
        if (response.data.payment_status === 'paid') {
          toast.success('Deposit successful! Funds added to your account.');
          await refreshUser();
          navigate('/dashboard');
          return;
        }
        
        if (response.data.status === 'expired') {
          toast.error('Payment session expired. Please try again.');
          navigate('/deposit');
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000);
        } else {
          toast.error('Payment status check timed out. Please check your account.');
          navigate('/deposit');
        }
      } catch (error) {
        console.error('Error checking payment:', error);
        toast.error('Error checking payment status');
        navigate('/deposit');
      }
    };
    
    pollStatus();
  };
  
  const handleStripeDeposit = async () => {
    if (amount < 10) {
      toast.error('Minimum deposit is $10');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/deposits/stripe/create-session', {
        amount: parseFloat(amount),
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create payment session';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCryptoDeposit = async () => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/deposits/crypto', {
        currency: selectedCrypto,
        amount: parseFloat(amount)
      });
      
      setCryptoAddress(response.data);
      toast.success('Deposit address generated!');
    } catch (error) {
      toast.error('Failed to generate deposit address');
    } finally {
      setLoading(false);
    }
  };
  
  if (checkingPayment) {
    return (
      <div className="min-h-screen flex flex-col pt-16">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-electric animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Processing Payment</h2>
            <p className="text-gray-400">Please wait while we confirm your deposit...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16" data-testid="deposit-page">
      <Navbar />
      
      <main className="flex-grow p-4 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-semibold text-white mb-2">Deposit Funds</h1>
          <p className="text-gray-400 mb-8">Add funds to your trading account</p>
          
          {/* Payment Method Selection */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <button
              className={`glass-panel rounded-xl p-4 text-center transition-all ${
                method === 'stripe' ? 'border-electric bg-electric/10' : 'hover:bg-white/5'
              }`}
              onClick={() => setMethod('stripe')}
              data-testid="method-stripe"
            >
              <CreditCard className={`w-8 h-8 mx-auto mb-2 ${method === 'stripe' ? 'text-electric' : 'text-gray-400'}`} />
              <span className={`text-sm ${method === 'stripe' ? 'text-white' : 'text-gray-400'}`}>Card</span>
            </button>
            
            <button
              className={`glass-panel rounded-xl p-4 text-center transition-all ${
                method === 'crypto' ? 'border-electric bg-electric/10' : 'hover:bg-white/5'
              }`}
              onClick={() => setMethod('crypto')}
              data-testid="method-crypto"
            >
              <Bitcoin className={`w-8 h-8 mx-auto mb-2 ${method === 'crypto' ? 'text-electric' : 'text-gray-400'}`} />
              <span className={`text-sm ${method === 'crypto' ? 'text-white' : 'text-gray-400'}`}>Crypto</span>
            </button>
            
            <button
              className={`glass-panel rounded-xl p-4 text-center transition-all ${
                method === 'bank' ? 'border-electric bg-electric/10' : 'hover:bg-white/5'
              }`}
              onClick={() => setMethod('bank')}
              data-testid="method-bank"
            >
              <Building2 className={`w-8 h-8 mx-auto mb-2 ${method === 'bank' ? 'text-electric' : 'text-gray-400'}`} />
              <span className={`text-sm ${method === 'bank' ? 'text-white' : 'text-gray-400'}`}>Bank</span>
            </button>
          </div>
          
          {/* Amount Selection */}
          <div className="glass-panel rounded-xl p-6 mb-6">
            <label className="text-sm text-gray-400 mb-4 block">Select Amount</label>
            
            <div className="grid grid-cols-5 gap-2 mb-4">
              {presetAmounts.map(preset => (
                <button
                  key={preset}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    amount === preset
                      ? 'bg-electric text-white'
                      : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setAmount(preset)}
                >
                  ${preset}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                className="input-field pl-8 text-lg font-mono"
                min="10"
                data-testid="deposit-amount"
              />
            </div>
            
            <p className="text-xs text-gray-500 mt-2">Minimum deposit: $10</p>
          </div>
          
          {/* Stripe Payment */}
          {method === 'stripe' && (
            <button
              onClick={handleStripeDeposit}
              disabled={loading || amount < 10}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="stripe-submit"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Proceed to Payment
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
          
          {/* Crypto Payment */}
          {method === 'crypto' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['BTC', 'ETH', 'USDT'].map(crypto => (
                  <button
                    key={crypto}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCrypto === crypto
                        ? 'bg-amber text-space'
                        : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                    }`}
                    onClick={() => {
                      setSelectedCrypto(crypto);
                      setCryptoAddress(null);
                    }}
                  >
                    {crypto}
                  </button>
                ))}
              </div>
              
              {cryptoAddress ? (
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">Send {selectedCrypto} to:</p>
                  <code className="block p-3 bg-space-light rounded-lg text-sm text-neon font-mono break-all">
                    {cryptoAddress.address}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    {cryptoAddress.message}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleCryptoDeposit}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="crypto-submit"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate {selectedCrypto} Address
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          
          {/* Bank Transfer */}
          {method === 'bank' && (
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Bank Transfer Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bank Name:</span>
                  <span className="text-white">ORBITAL Trading Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Account Number:</span>
                  <span className="text-white font-mono">1234567890</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Routing Number:</span>
                  <span className="text-white font-mono">021000021</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reference:</span>
                  <span className="text-neon font-mono">Your User ID</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Include your user ID as reference. Funds will be credited within 1-3 business days.
              </p>
            </div>
          )}
          
          {/* Security Notice */}
          <div className="mt-6 p-4 rounded-lg bg-electric/5 border border-electric/10">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-electric flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white">Secure Payment Processing</p>
                <p className="text-xs text-gray-400 mt-1">
                  All transactions are encrypted and processed through secure payment gateways.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Deposit;
