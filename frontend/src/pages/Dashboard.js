import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, ArrowUp, ArrowDown, Clock, 
  TrendingUp, TrendingDown, Wallet, Zap, Activity,
  MessageCircle, X, Send, Minus, Plus, Sparkles, Target,
  ChevronRight, BarChart3, DollarSign, Eye, Flame
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TradingChart from '../components/TradingChart';
import api from '../services/api';
import socketService from '../services/socket';

const Dashboard = () => {
  const { user, refreshUser, isDemoMode } = useAuth();
  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({ crypto: {}, forex: {}, metals: {} });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('forex');
  const [openTrades, setOpenTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [tradeAmount, setTradeAmount] = useState(100);
  const [expiryTime, setExpiryTime] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [tradeType, setTradeType] = useState('standard'); // 'standard', 'touch', 'no_touch'
  const [targetPrice, setTargetPrice] = useState(null);
  
  const [prediction, setPrediction] = useState({ buy_confidence: 50, sell_confidence: 50, reasoning: '' });
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const countdownRef = useRef(null);
  const predictionRef = useRef(null);
  const [tick, setTick] = useState(0);
  
  // P&L tracker state
  const [pnl, setPnl] = useState({ daily: { profit: 0, wins: 0, losses: 0, win_rate: 0 }, weekly: { profit: 0 }, monthly: { profit: 0 } });
  const [pnlPeriod, setPnlPeriod] = useState('daily');

  const expiryOptions = [
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '60s' }
  ];

  const cryptoMap = {
    'BTC/USD': 'bitcoin', 'ETH/USD': 'ethereum', 'XRP/USD': 'ripple',
    'LTC/USD': 'litecoin', 'SOL/USD': 'solana', 'DOGE/USD': 'dogecoin',
    'ADA/USD': 'cardano', 'DOT/USD': 'polkadot'
  };

  const fetchPrediction = useCallback(async () => {
    if (!selectedAsset) return;
    try {
      setPredictionLoading(true);
      const cp = getCurrentPrice();
      const response = await api.post('/api/predict', {
        asset: selectedAsset.symbol,
        asset_type: selectedAsset.asset_type,
        current_price: cp,
        price_history: priceHistory.slice(-10)
      });
      setPrediction(response.data);
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setPredictionLoading(false);
    }
  }, [selectedAsset, priceHistory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetsRes, pricesRes, tradesRes] = await Promise.all([
          api.get('/api/assets'),
          api.get('/api/prices'),
          api.get('/api/trades?limit=50')
        ]);
        setAssets(assetsRes.data);
        setPrices(pricesRes.data || { crypto: {}, forex: {}, metals: {} });
        const forexAssets = assetsRes.data.filter(a => a.asset_type === 'forex');
        if (forexAssets.length > 0 && !selectedAsset) setSelectedAsset(forexAssets[0]);
        setOpenTrades(tradesRes.data.filter(t => t.status === 'open'));
        setTradeHistory(tradesRes.data.filter(t => t.status !== 'open'));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    socketService.connect();
    socketService.on('price_update', (data) => { if (data) setPrices(data); });
    socketService.on('trade_settled', (data) => {
      const profitText = data.profit >= 0 ? `+$${data.profit.toFixed(2)}` : `-$${Math.abs(data.profit).toFixed(2)}`;
      if (data.status === 'won') toast.success(`Trade Won! ${profitText}`);
      else toast.error(`Trade closed: ${profitText}`);
      refreshUser();
      fetchTrades();
      fetchPnl();
    });

    const interval = setInterval(() => fetchTrades(), 2000);
    // Fast tick for smooth countdown (every 50ms)
    countdownRef.current = setInterval(() => setTick(t => t + 1), 50);
    // Fetch P&L every 10 seconds
    fetchPnl();
    const pnlInterval = setInterval(fetchPnl, 10000);

    return () => {
      socketService.disconnect();
      clearInterval(interval);
      clearInterval(pnlInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (predictionRef.current) clearInterval(predictionRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      setPriceHistory([]);
      fetchPrediction();
      if (predictionRef.current) clearInterval(predictionRef.current);
      predictionRef.current = setInterval(fetchPrediction, 8000);
    }
    return () => { if (predictionRef.current) clearInterval(predictionRef.current); };
  }, [selectedAsset]);

  useEffect(() => {
    const price = getCurrentPrice();
    if (price > 0) setPriceHistory(prev => [...prev.slice(-19), price]);
  }, [prices]);

  const fetchTrades = async () => {
    try {
      const res = await api.get('/api/trades?limit=50');
      setOpenTrades(res.data.filter(t => t.status === 'open'));
      setTradeHistory(res.data.filter(t => t.status !== 'open'));
    } catch (error) {}
  };

  const fetchPnl = async () => {
    try {
      const res = await api.get('/api/user/pnl');
      setPnl(res.data);
    } catch (error) {}
  };

  const getCurrentPrice = useCallback((sym = null, type = null) => {
    const symbol = sym || selectedAsset?.symbol;
    const t = type || selectedAsset?.asset_type;
    if (!symbol || !prices) return 0;
    if (t === 'crypto') { const id = cryptoMap[symbol]; return prices.crypto?.[id]?.usd || 0; }
    if (t === 'forex') return prices.forex?.[symbol]?.price || 0;
    if (t === 'metals') return prices.metals?.[symbol]?.price || 0;
    return 0;
  }, [selectedAsset, prices]);

  const getChange24h = useCallback((sym = null, type = null) => {
    const symbol = sym || selectedAsset?.symbol;
    const t = type || selectedAsset?.asset_type;
    if (!symbol || !prices) return 0;
    if (t === 'crypto') { const id = cryptoMap[symbol]; return prices.crypto?.[id]?.usd_24h_change || 0; }
    if (t === 'forex') return prices.forex?.[symbol]?.change_24h || 0;
    if (t === 'metals') return prices.metals?.[symbol]?.change_24h || 0;
    return 0;
  }, [selectedAsset, prices]);

  const placeTrade = async (direction) => {
    if (!selectedAsset) { toast.error('Please select an asset'); return; }
    if (tradeAmount < 1) { toast.error('Minimum trade amount is $1'); return; }
    if (tradeAmount > (user?.balance || 0)) { toast.error('Insufficient balance'); return; }
    
    // Validate Touch/No Touch trades
    if ((direction === 'touch' || direction === 'no_touch') && !targetPrice) {
      toast.error('Please set a target price');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        asset: selectedAsset.symbol, 
        direction,
        amount: tradeAmount, 
        expiry_seconds: expiryTime,
        trade_type: tradeType
      };
      
      // Add target price for Touch/No Touch
      if (direction === 'touch' || direction === 'no_touch') {
        payload.target_price = targetPrice;
      }
      
      await api.post('/api/trades', payload);
      const tradeTypeLabel = direction === 'touch' ? 'TOUCH' : direction === 'no_touch' ? 'NO TOUCH' : direction.toUpperCase();
      toast.success(`${tradeTypeLabel} position opened on ${selectedAsset.symbol}!`);
      await refreshUser();
      await fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place trade');
    } finally {
      setSubmitting(false);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    try {
      const response = await api.post('/api/chat', { message: userMessage });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) { toast.error('Chat service unavailable'); }
    finally { setChatLoading(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const filteredAssets = assets.filter(a => a.asset_type === selectedCategory);

  const formatPrice = (price, aType) => {
    if (!price || price === 0) return '-.--';
    if (aType === 'forex') return price.toFixed(5);
    if (aType === 'metals') return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Force re-render every 50ms for smooth countdown - tick is used in render
  const getTimeLeft = useCallback((et) => {
    // Include tick in calculation to ensure re-render triggers recalculation
    void tick; // Ensure tick is referenced
    return Math.max(0, new Date(et).getTime() - Date.now());
  }, [tick]);
  
  const formatTimeLeft = (ms) => {
    if (ms <= 0) return '0.0s';
    const totalSec = ms / 1000;
    if (totalSec < 10) return `${totalSec.toFixed(1)}s`;
    const s = Math.ceil(totalSec);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${(s % 60).toString().padStart(2, '0')}` : `${s}s`;
  };

  const potentialPayout = tradeAmount * (1 + (selectedAsset?.payout_rate || 0.85));
  const currentPriceVal = getCurrentPrice();
  const currentChange = getChange24h();
  const isPositiveChange = currentChange >= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="relative">
            <div className="w-16 h-16 border-4 border-electric/30 rounded-full"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-electric border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-gray-500 text-sm font-mono">Loading markets...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]" data-testid="dashboard">
      <Navbar />
      
      {/* Subtle ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-electric/[0.03] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-vibrant/[0.03] rounded-full blur-[120px]"></div>
      </div>

      <main className="flex-grow pt-16 relative z-10">
        {/* Scrolling Price Ticker */}
        <div className="border-b border-white/5 bg-[#0a0f1a] overflow-hidden">
          <div className="flex items-center gap-6 py-1.5 px-4 animate-marquee whitespace-nowrap">
            {assets.slice(0, 12).map(a => {
              const p = getCurrentPrice(a.symbol, a.asset_type);
              const c = getChange24h(a.symbol, a.asset_type);
              const pos = c >= 0;
              return (
                <span key={a.symbol} className="inline-flex items-center gap-2 text-xs font-mono cursor-pointer hover:opacity-80" 
                  onClick={() => { setSelectedAsset(a); setSelectedCategory(a.asset_type); }}>
                  <span className="text-gray-500">{a.symbol}</span>
                  <span className={pos ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPrice(p, a.asset_type)}
                  </span>
                  <span className={`${pos ? 'text-emerald-500' : 'text-red-500'} text-[10px]`}>
                    {pos ? '+' : ''}{c.toFixed(2)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="p-2 lg:p-3 max-w-[1800px] mx-auto w-full">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-2">
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border-l-2 border-electric/40">
              <Wallet className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  Balance
                  {isDemoMode && <span className="px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-bold bg-amber-400/20 text-amber-400 animate-pulse">DEMO</span>}
                </div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-white truncate">${(user?.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border-l-2 border-amber/40">
              <Flame className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              <div>
                <div className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider">Active</div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-amber-400">{openTrades.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border-l-2 border-emerald-500/40 cursor-pointer"
              onClick={() => setPnlPeriod(p => p === 'daily' ? 'weekly' : p === 'weekly' ? 'monthly' : 'daily')}
              data-testid="pnl-toggle">
              <TrendingUp className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  P&L <span className="text-electric">{pnlPeriod === 'daily' ? 'Today' : pnlPeriod === 'weekly' ? 'Week' : 'Month'}</span>
                </div>
                <div className={`font-mono text-xs sm:text-sm font-semibold ${pnl[pnlPeriod]?.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pnl[pnlPeriod]?.profit >= 0 ? '+' : ''}${(pnl[pnlPeriod]?.profit || 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border-l-2 border-white/10">
              <BarChart3 className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
              <div>
                <div className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider">Win Rate</div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-white">
                  {pnl.daily?.win_rate > 0 ? `${pnl.daily.win_rate}%` : '--'}
                  {pnl.daily?.total > 0 && <span className="text-[9px] text-gray-600 ml-1 hidden sm:inline">{pnl.daily.wins}W/{pnl.daily.losses}L</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            {/* Left: Asset List */}
            <div className="lg:col-span-2 bg-white/[0.02] rounded-xl border border-white/[0.04] flex flex-col h-[200px] sm:h-[300px] lg:h-[460px] overflow-hidden">
              <div className="px-3 pt-3 pb-2">
                <div className="flex gap-1">
                  {['forex', 'crypto', 'metals'].map(cat => (
                    <button key={cat}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        selectedCategory === cat
                          ? 'bg-electric text-white'
                          : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        const ca = assets.filter(a => a.asset_type === cat);
                        if (ca.length > 0) setSelectedAsset(ca[0]);
                      }}
                      data-testid={`category-${cat}`}
                    >{cat}</button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto flex-grow px-2 pb-2 space-y-0.5 custom-scrollbar">
                {filteredAssets.map(asset => {
                  const price = getCurrentPrice(asset.symbol, asset.asset_type);
                  const change = getChange24h(asset.symbol, asset.asset_type);
                  const pos = change >= 0;
                  const sel = selectedAsset?.symbol === asset.symbol;
                  return (
                    <div key={asset.symbol}
                      className={`px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        sel ? 'bg-electric/10 border border-electric/20' : 'hover:bg-white/[0.03] border border-transparent'
                      }`}
                      onClick={() => setSelectedAsset(asset)}
                      data-testid={`asset-${asset.symbol}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className={`text-xs font-semibold ${sel ? 'text-white' : 'text-gray-300'}`}>{asset.symbol}</div>
                          <div className="text-[9px] text-gray-600">{Math.round(asset.payout_rate * 100)}% payout</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono text-xs font-medium ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatPrice(price, asset.asset_type)}
                          </div>
                          <div className={`text-[9px] ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pos ? '+' : ''}{change.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Chart */}
            <div className="lg:col-span-7 bg-white/[0.02] rounded-xl border border-white/[0.04] flex flex-col h-[300px] sm:h-[380px] lg:h-[460px] overflow-hidden">
              {/* Chart Header */}
              <div className="flex items-center justify-between px-2.5 sm:px-4 py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-sm sm:text-base font-bold text-white">{selectedAsset?.symbol || 'Select Asset'}</span>
                    <span className="text-[10px] text-gray-600 ml-1.5 hidden sm:inline">{selectedAsset?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`font-mono text-lg font-bold ${isPositiveChange ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPrice(currentPriceVal, selectedAsset?.asset_type)}
                    </span>
                    <span className={`ml-2 text-xs font-mono ${isPositiveChange ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPositiveChange ? '+' : ''}{currentChange.toFixed(2)}%
                    </span>
                  </div>
                  {/* Live indicator */}
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[9px] text-gray-600 uppercase">Live</span>
                  </div>
                </div>
              </div>
              {/* Chart Body */}
              <div className="flex-grow relative">
                <TradingChart 
                  asset={selectedAsset?.symbol}
                  currentPrice={currentPriceVal}
                  assetType={selectedAsset?.asset_type}
                />
              </div>
            </div>

            {/* Right: Trade Panel */}
            <div className="lg:col-span-3 bg-white/[0.02] rounded-xl border border-white/[0.04] flex flex-col h-auto lg:h-[520px] overflow-hidden">
              {/* Trade Header */}
              <div className="px-4 py-2.5 border-b border-white/[0.04] flex justify-between items-center">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-electric" /> TRADE
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  {Math.round((selectedAsset?.payout_rate || 0.85) * 100)}% return
                </span>
              </div>

              {/* Trade Type Selector */}
              <div className="px-4 pt-3 pb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Trade Type</span>
                <div className="flex gap-1 p-0.5 bg-black/20 rounded-lg">
                  <button
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      tradeType === 'standard' ? 'bg-electric text-white' : 'text-gray-500 hover:text-white'
                    }`}
                    onClick={() => setTradeType('standard')}
                    data-testid="trade-type-standard"
                  >High/Low</button>
                  <button
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      tradeType === 'touch' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-white'
                    }`}
                    onClick={() => setTradeType('touch')}
                    data-testid="trade-type-touch"
                  >Touch</button>
                  <button
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      tradeType === 'no_touch' ? 'bg-cyan-500 text-white' : 'text-gray-500 hover:text-white'
                    }`}
                    onClick={() => setTradeType('no_touch')}
                    data-testid="trade-type-notouch"
                  >No Touch</button>
                </div>
              </div>

              {/* Amount */}
              <div className="px-4 pb-2 space-y-2">
                <div className="bg-black/20 rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Amount</span>
                    <span className="text-[10px] text-gray-600">Max: ${(user?.balance || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
                      onClick={() => setTradeAmount(Math.max(1, tradeAmount - 25))}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      <input type="number" value={tradeAmount}
                        onChange={(e) => setTradeAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                        className="bg-transparent text-center font-mono text-xl text-white w-20 focus:outline-none"
                        data-testid="trade-amount" />
                    </div>
                    <button className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
                      onClick={() => setTradeAmount(tradeAmount + 25)}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-1">
                  {[25, 50, 100, 250, 500].map(amt => (
                    <button key={amt}
                      className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                        tradeAmount === amt ? 'bg-electric text-white' : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-white'
                      }`}
                      onClick={() => setTradeAmount(amt)}>${amt}</button>
                  ))}
                </div>

                {/* Target Price for Touch/No Touch */}
                {(tradeType === 'touch' || tradeType === 'no_touch') && (
                  <div className="bg-black/20 rounded-lg p-2.5 border border-white/[0.04]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Target Price</span>
                      <span className="text-[10px] text-gray-600">Current: {formatPrice(currentPriceVal, selectedAsset?.asset_type)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        onClick={() => setTargetPrice(currentPriceVal * 1.002)}
                        data-testid="target-above">
                        Above (+0.2%)
                      </button>
                      <button className="flex-1 py-1.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        onClick={() => setTargetPrice(currentPriceVal * 0.998)}
                        data-testid="target-below">
                        Below (-0.2%)
                      </button>
                    </div>
                    <input type="number" value={targetPrice || ''} onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                      className="w-full mt-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none text-center"
                      placeholder="Enter target price" step="0.00001" data-testid="target-price-input" />
                  </div>
                )}

                {/* Duration */}
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Duration</span>
                  <div className="flex gap-1">
                    {expiryOptions.map(opt => (
                      <button key={opt.value}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                          expiryTime === opt.value ? 'bg-electric text-white' : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-white'
                        }`}
                        onClick={() => setExpiryTime(opt.value)}
                        data-testid={`expiry-${opt.value}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* Profit Display */}
                <div className="flex justify-between items-center bg-emerald-500/5 rounded-lg px-3 py-1.5 border border-emerald-500/10">
                  <span className="text-[10px] text-gray-500">Profit</span>
                  <span className="font-mono text-sm text-emerald-400 font-bold" data-testid="potential-payout">
                    +${(potentialPayout - tradeAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Trade Buttons */}
              <div className="px-4 pb-3 mt-auto">
                {tradeType === 'standard' ? (
                  <div className="flex gap-2">
                    <motion.button
                      className="flex-1 relative overflow-hidden rounded-xl py-3 group transition-all disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(16,185,129,0.25)' }}
                      onClick={() => placeTrade('buy')}
                      disabled={submitting || !selectedAsset}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      data-testid="buy-btn"
                    >
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <ArrowUp className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-emerald-400 text-sm">BUY</span>
                        </div>
                        <span className="font-mono text-xl font-black text-emerald-300">{prediction.buy_confidence}%</span>
                      </div>
                    </motion.button>
                    <motion.button
                      className="flex-1 relative overflow-hidden rounded-xl py-3 group transition-all disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)', border: '1px solid rgba(239,68,68,0.25)' }}
                      onClick={() => placeTrade('sell')}
                      disabled={submitting || !selectedAsset}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      data-testid="sell-btn"
                    >
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <ArrowDown className="w-4 h-4 text-red-400" />
                          <span className="font-bold text-red-400 text-sm">SELL</span>
                        </div>
                        <span className="font-mono text-xl font-black text-red-300">{prediction.sell_confidence}%</span>
                      </div>
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    className={`w-full relative overflow-hidden rounded-xl py-4 group transition-all disabled:opacity-40 ${
                      tradeType === 'touch' 
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30'
                        : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                    }`}
                    onClick={() => placeTrade(tradeType)}
                    disabled={submitting || !selectedAsset || !targetPrice}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    data-testid={`${tradeType}-btn`}
                  >
                    <div className="relative z-10 flex flex-col items-center">
                      <span className={`font-bold text-sm mb-1 ${tradeType === 'touch' ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {tradeType === 'touch' ? 'TOUCH' : 'NO TOUCH'} @ {targetPrice?.toFixed(5)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {tradeType === 'touch' ? 'Win if price touches target' : 'Win if price never touches target'}
                      </span>
                    </div>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Bottom: Trades Table */}
            <div className="lg:col-span-12 bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
              <div className="flex border-b border-white/[0.04] px-4">
                <button className={`px-4 py-2.5 text-xs font-semibold transition-all relative ${
                  !showHistory ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  onClick={() => setShowHistory(false)} data-testid="open-trades-tab">
                  Active Trades
                  {openTrades.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                      {openTrades.length}
                    </span>
                  )}
                  {!showHistory && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric"></div>}
                </button>
                <button className={`px-4 py-2.5 text-xs font-semibold transition-all relative ${
                  showHistory ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  onClick={() => setShowHistory(true)} data-testid="history-tab">
                  History
                  {showHistory && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric"></div>}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[200px] custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-panel z-10">
                    <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
                      <th className="px-4 py-2 font-medium">Asset</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Entry</th>
                      <th className="px-4 py-2 font-medium">Current</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">{showHistory ? 'P&L' : 'Time'}</th>
                      <th className="px-4 py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showHistory ? tradeHistory : openTrades).slice(0, 10).map((trade) => {
                      const tl = getTimeLeft(trade.expiry_time);
                      const cp = getCurrentPrice(trade.asset, trade.asset_type);
                      const isWin = (trade.direction === 'buy' || trade.direction === 'call')
                        ? cp > trade.strike_price : cp < trade.strike_price;
                      const prog = Math.max(0, Math.min(100, (tl / (trade.expiry_seconds * 1000)) * 100));

                      return (
                        <tr key={trade.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors text-xs">
                          <td className="px-4 py-2">
                            <span className="font-semibold text-white">{trade.asset}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (trade.direction === 'buy' || trade.direction === 'call')
                                ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
                            }`}>
                              {trade.direction === 'call' ? 'BUY' : trade.direction === 'put' ? 'SELL' : trade.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-400">{formatPrice(trade.strike_price, trade.asset_type)}</td>
                          <td className={`px-4 py-2 font-mono font-medium ${
                            trade.status === 'open' ? (isWin ? 'text-buy' : 'text-sell') : 'text-gray-500'
                          }`}>
                            {trade.status === 'open' ? formatPrice(cp, trade.asset_type) : formatPrice(trade.close_price, trade.asset_type)}
                          </td>
                          <td className="px-4 py-2 font-mono text-white">${trade.amount.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            {showHistory ? (
                              <span className={`font-mono font-bold ${trade.profit >= 0 ? 'text-buy' : 'text-sell'}`}>
                                {trade.profit >= 0 ? '+' : ''}${trade.profit?.toFixed(2)}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold tabular-nums min-w-[40px] ${
                                  tl > 10000 ? 'text-amber-400' : tl > 3000 ? 'text-orange-400' : 'text-sell animate-pulse'
                                }`}>
                                  {formatTimeLeft(tl)}
                                </span>
                                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-100 ${
                                    tl > 10000 ? 'bg-amber-500' : tl > 3000 ? 'bg-orange-500' : 'bg-sell'
                                  }`} style={{ width: `${prog}%` }} />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {trade.status === 'open' ? (
                              <span className={`text-[10px] font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isWin ? 'WINNING' : 'LOSING'}
                              </span>
                            ) : (
                              <span className={`text-[10px] font-bold ${
                                trade.status === 'won' ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {trade.status === 'won' ? `+$${(trade.amount * trade.payout_rate).toFixed(2)}` : `-$${trade.amount.toFixed(2)}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(showHistory ? tradeHistory : openTrades).length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center">
                          <div className="text-gray-600 text-xs">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            {showHistory ? 'No trade history' : 'No active trades'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chat Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div className="absolute bottom-14 right-0 w-72 h-96 bg-[#0d1220] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-white/10"
              initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}>
              <div className="px-3 py-2.5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">AI Assistant</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Ask about trading</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      msg.role === 'user' ? 'bg-electric text-white' : 'bg-white/5 text-gray-300'
                    }`}>{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-xl px-3 py-2 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendChatMessage} className="p-2 border-t border-white/5">
                <div className="flex gap-1.5">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything..." className="flex-grow bg-white/5 border border-white/5 rounded-lg py-2 px-3 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-electric/50" data-testid="chat-input" />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()}
                    className="p-2 rounded-lg bg-electric text-white disabled:opacity-30" data-testid="chat-send">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setChatOpen(!chatOpen)}
          className="w-11 h-11 rounded-xl bg-electric/90 flex items-center justify-center shadow-lg shadow-electric/20 hover:shadow-electric/40 transition-shadow"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} data-testid="chat-toggle">
          {chatOpen ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;
