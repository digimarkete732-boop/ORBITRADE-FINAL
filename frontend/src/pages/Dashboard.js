import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Search, Filter, ArrowUp, ArrowDown, Clock, 
  TrendingUp, TrendingDown, ChevronRight, Wallet, 
  MessageCircle, X, Send, Minus, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TradingChart from '../components/TradingChart';
import api from '../services/api';
import socketService from '../services/socket';

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('forex');
  const [trades, setTrades] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Trade form state
  const [tradeAmount, setTradeAmount] = useState(100);
  const [expiryTime, setExpiryTime] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Expiry options
  const expiryOptions = [
    { value: 60, label: '1 Min' },
    { value: 300, label: '5 Min' },
    { value: 900, label: '15 Min' },
    { value: 3600, label: '1 Hour' }
  ];

  // Fetch assets and prices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetsRes, pricesRes, tradesRes] = await Promise.all([
          api.get('/api/assets'),
          api.get('/api/prices'),
          api.get('/api/trades?limit=50')
        ]);
        
        setAssets(assetsRes.data);
        setPrices(pricesRes.data);
        setTrades(tradesRes.data);
        
        // Set default selected asset
        const forexAssets = assetsRes.data.filter(a => a.asset_type === 'forex');
        if (forexAssets.length > 0) {
          setSelectedAsset(forexAssets[0]);
        }
        
        // Separate open and closed trades
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
    
    // Connect to socket for real-time prices
    socketService.connect();
    
    socketService.on('price_update', (data) => {
      setPrices(data);
    });
    
    socketService.on('trade_settled', (data) => {
      toast.success(`Trade ${data.status}: ${data.profit >= 0 ? '+' : ''}$${data.profit.toFixed(2)}`);
      refreshUser();
      fetchTrades();
    });

    // Refresh trades periodically
    const interval = setInterval(() => {
      fetchTrades();
    }, 5000);

    return () => {
      socketService.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await api.get('/api/trades?limit=50');
      setTrades(res.data);
      setOpenTrades(res.data.filter(t => t.status === 'open'));
      setTradeHistory(res.data.filter(t => t.status !== 'open'));
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  // Get current price for selected asset
  const getCurrentPrice = useCallback(() => {
    if (!selectedAsset || !prices) return 0;
    
    const { symbol, asset_type } = selectedAsset;
    
    if (asset_type === 'crypto') {
      const cryptoMap = {
        'BTC/USD': 'bitcoin',
        'ETH/USD': 'ethereum',
        'XRP/USD': 'ripple',
        'LTC/USD': 'litecoin',
        'SOL/USD': 'solana',
        'DOGE/USD': 'dogecoin',
        'ADA/USD': 'cardano',
        'DOT/USD': 'polkadot'
      };
      const cryptoId = cryptoMap[symbol];
      return prices.crypto?.[cryptoId]?.usd || 0;
    }
    
    if (asset_type === 'forex') {
      return prices.forex?.[symbol]?.price || 0;
    }
    
    if (asset_type === 'metals') {
      return prices.metals?.[symbol]?.price || 0;
    }
    
    return 0;
  }, [selectedAsset, prices]);

  const getChange24h = useCallback(() => {
    if (!selectedAsset || !prices) return 0;
    
    const { symbol, asset_type } = selectedAsset;
    
    if (asset_type === 'crypto') {
      const cryptoMap = {
        'BTC/USD': 'bitcoin',
        'ETH/USD': 'ethereum',
        'XRP/USD': 'ripple',
        'LTC/USD': 'litecoin',
        'SOL/USD': 'solana',
        'DOGE/USD': 'dogecoin',
        'ADA/USD': 'cardano',
        'DOT/USD': 'polkadot'
      };
      const cryptoId = cryptoMap[symbol];
      return prices.crypto?.[cryptoId]?.usd_24h_change || 0;
    }
    
    if (asset_type === 'forex') {
      return prices.forex?.[symbol]?.change_24h || 0;
    }
    
    if (asset_type === 'metals') {
      return prices.metals?.[symbol]?.change_24h || 0;
    }
    
    return 0;
  }, [selectedAsset, prices]);

  // Place trade
  const placeTrade = async (direction) => {
    if (!selectedAsset) {
      toast.error('Please select an asset');
      return;
    }
    
    if (tradeAmount < 1) {
      toast.error('Minimum trade amount is $1');
      return;
    }
    
    if (tradeAmount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await api.post('/api/trades', {
        asset: selectedAsset.symbol,
        direction,
        amount: tradeAmount,
        expiry_seconds: expiryTime
      });
      
      toast.success(`${direction.toUpperCase()} trade placed on ${selectedAsset.symbol}`);
      await refreshUser();
      await fetchTrades();
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to place trade';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Chat functions
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
    } catch (error) {
      toast.error('Chat service unavailable');
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Filter assets by category
  const filteredAssets = assets.filter(a => a.asset_type === selectedCategory);

  // Format price display
  const formatPrice = (price, assetType) => {
    if (assetType === 'forex') {
      return price.toFixed(5);
    }
    if (assetType === 'metals') {
      return price.toFixed(2);
    }
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate potential payout
  const potentialPayout = tradeAmount * (1 + (selectedAsset?.payout_rate || 0.85));

  if (loading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-electric border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16" data-testid="dashboard">
      <Navbar />
      
      <main className="flex-grow p-2 md:p-4 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          
          {/* Left Panel: Assets */}
          <div className="lg:col-span-3 glass-panel rounded-xl flex flex-col h-[500px] lg:h-[600px] overflow-hidden">
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-space/50">
              <h2 className="text-sm font-medium text-white flex items-center gap-2">
                <Globe className="w-4 h-4" /> Markets
              </h2>
              <div className="flex gap-2 text-gray-400">
                <Search className="w-4 h-4 hover:text-white cursor-pointer" />
                <Filter className="w-4 h-4 hover:text-white cursor-pointer" />
              </div>
            </div>
            
            {/* Category Tabs */}
            <div className="flex p-2 gap-1 border-b border-white/5 text-xs">
              {['forex', 'crypto', 'metals'].map(cat => (
                <button 
                  key={cat}
                  className={`px-3 py-1 rounded capitalize ${
                    selectedCategory === cat 
                      ? 'bg-white/10 text-white' 
                      : 'hover:bg-white/5 text-gray-400'
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`category-${cat}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className="overflow-y-auto flex-grow p-2 space-y-1 custom-scrollbar">
              {filteredAssets.map(asset => {
                const price = (() => {
                  if (asset.asset_type === 'crypto') {
                    const cryptoMap = {
                      'BTC/USD': 'bitcoin', 'ETH/USD': 'ethereum', 'XRP/USD': 'ripple',
                      'LTC/USD': 'litecoin', 'SOL/USD': 'solana', 'DOGE/USD': 'dogecoin',
                      'ADA/USD': 'cardano', 'DOT/USD': 'polkadot'
                    };
                    return prices.crypto?.[cryptoMap[asset.symbol]]?.usd || 0;
                  }
                  if (asset.asset_type === 'forex') return prices.forex?.[asset.symbol]?.price || 0;
                  if (asset.asset_type === 'metals') return prices.metals?.[asset.symbol]?.price || 0;
                  return 0;
                })();
                
                const change = (() => {
                  if (asset.asset_type === 'crypto') {
                    const cryptoMap = {
                      'BTC/USD': 'bitcoin', 'ETH/USD': 'ethereum', 'XRP/USD': 'ripple',
                      'LTC/USD': 'litecoin', 'SOL/USD': 'solana', 'DOGE/USD': 'dogecoin',
                      'ADA/USD': 'cardano', 'DOT/USD': 'polkadot'
                    };
                    return prices.crypto?.[cryptoMap[asset.symbol]]?.usd_24h_change || 0;
                  }
                  if (asset.asset_type === 'forex') return prices.forex?.[asset.symbol]?.change_24h || 0;
                  if (asset.asset_type === 'metals') return prices.metals?.[asset.symbol]?.change_24h || 0;
                  return 0;
                })();
                
                const isPositive = change >= 0;
                const isSelected = selectedAsset?.symbol === asset.symbol;
                
                return (
                  <div 
                    key={asset.id}
                    className={`p-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors border border-transparent
                      ${isSelected ? 'bg-white/10 border-white/10' : 'hover:bg-white/5 hover:border-white/5'}`}
                    onClick={() => setSelectedAsset(asset)}
                    data-testid={`asset-${asset.symbol}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-space-light flex items-center justify-center border border-white/10">
                        {asset.asset_type === 'crypto' && <span className="text-amber text-xs">₿</span>}
                        {asset.asset_type === 'forex' && <span className="text-electric text-xs">$</span>}
                        {asset.asset_type === 'metals' && <span className="text-amber text-xs">Au</span>}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white group-hover:text-electric transition-colors">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-gray-500">Payout {Math.round(asset.payout_rate * 100)}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm ${isPositive ? 'text-neon' : 'text-vibrant'}`}>
                        {formatPrice(price, asset.asset_type)}
                      </div>
                      <div className={`text-xs flex items-center justify-end gap-1 ${isPositive ? 'text-neon' : 'text-vibrant'}`}>
                        {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(change).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Panel: Chart */}
          <div className="lg:col-span-6 glass-panel rounded-xl flex flex-col relative overflow-hidden h-[400px] lg:h-[600px]">
            {/* Chart Header */}
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-space/50 z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-display font-medium text-white">
                  {selectedAsset?.symbol || 'Select Asset'}
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono text-xl ${getChange24h() >= 0 ? 'text-neon' : 'text-vibrant'}`}>
                    {formatPrice(getCurrentPrice(), selectedAsset?.asset_type)}
                  </span>
                  <span className={`text-xs ${getChange24h() >= 0 ? 'text-neon' : 'text-vibrant'}`}>
                    {getChange24h() >= 0 ? '+' : ''}{getChange24h().toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-grow relative">
              <TradingChart 
                asset={selectedAsset?.symbol}
                currentPrice={getCurrentPrice()}
                assetType={selectedAsset?.asset_type}
              />
            </div>
          </div>

          {/* Right Panel: Trade Execution */}
          <div className="lg:col-span-3 glass-panel rounded-xl flex flex-col h-[500px] lg:h-[600px] overflow-hidden border-t-2 border-t-electric">
            <div className="p-4 border-b border-white/5 bg-space/50 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-white">Execution</span>
                <span className="text-xs text-vibrant bg-vibrant/10 px-2 py-0.5 rounded border border-vibrant/20">
                  {Math.round((selectedAsset?.payout_rate || 0.85) * 100)}% Return
                </span>
              </div>
              
              {/* Amount Input */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">Amount ($)</label>
                <div className="bg-space-light border border-white/10 rounded-lg p-2 flex justify-between items-center">
                  <button 
                    className="text-gray-400 hover:text-white px-2"
                    onClick={() => setTradeAmount(Math.max(1, tradeAmount - 10))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input 
                    type="number" 
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="bg-transparent text-center font-mono text-white text-lg w-24 focus:outline-none"
                    data-testid="trade-amount"
                  />
                  <button 
                    className="text-gray-400 hover:text-white px-2"
                    onClick={() => setTradeAmount(tradeAmount + 10)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-6 px-1">
                <input 
                  type="range" 
                  min="1" 
                  max={Math.min(1000, user?.balance || 1000)}
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$1</span>
                  <span>${Math.min(1000, user?.balance || 1000)}</span>
                </div>
              </div>

              {/* Expiry Time */}
              <div className="mb-6">
                <label className="text-xs text-gray-400 mb-1 block">Expiry Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {expiryOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        expiryTime === opt.value
                          ? 'bg-electric/20 text-electric border border-electric/30'
                          : 'bg-space-light border border-white/10 text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setExpiryTime(opt.value)}
                      data-testid={`expiry-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Payout */}
              <div className="flex justify-between items-center mb-6 p-3 rounded-lg bg-electric/5 border border-electric/10">
                <span className="text-xs text-gray-400">Potential Payout</span>
                <span className="font-mono text-lg text-white font-medium" data-testid="potential-payout">
                  ${potentialPayout.toFixed(2)}
                </span>
              </div>

              {/* Call/Put Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="relative overflow-hidden group py-4 rounded-xl bg-space-light border border-neon/30 hover:border-neon transition-all hover:shadow-[0_0_20px_rgba(42,245,255,0.2)] disabled:opacity-50"
                  onClick={() => placeTrade('call')}
                  disabled={submitting || !selectedAsset}
                  data-testid="call-btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <ArrowUp className="w-5 h-5 text-neon" />
                    <span className="font-display font-bold text-neon tracking-wider">CALL</span>
                  </div>
                </button>
                
                <button 
                  className="relative overflow-hidden group py-4 rounded-xl bg-space-light border border-vibrant/30 hover:border-vibrant transition-all hover:shadow-[0_0_20px_rgba(157,78,221,0.2)] disabled:opacity-50"
                  onClick={() => placeTrade('put')}
                  disabled={submitting || !selectedAsset}
                  data-testid="put-btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-vibrant/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <ArrowDown className="w-5 h-5 text-vibrant" />
                    <span className="font-display font-bold text-vibrant tracking-wider">PUT</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="p-4 border-t border-white/5 mt-auto">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500">Available Balance</span>
                <span className="text-white font-mono">${(user?.balance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Open Positions</span>
                <span className="text-electric">{openTrades.length}</span>
              </div>
            </div>
          </div>

          {/* Bottom Panel: Open Positions & History */}
          <div className="lg:col-span-12 glass-panel rounded-xl overflow-hidden mt-2">
            <div className="flex border-b border-white/5 bg-space/50 px-4 pt-3">
              <button 
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  !showHistory ? 'text-neon border-neon' : 'text-gray-400 border-transparent hover:text-white'
                }`}
                onClick={() => setShowHistory(false)}
                data-testid="open-trades-tab"
              >
                Open Trades ({openTrades.length})
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  showHistory ? 'text-neon border-neon' : 'text-gray-400 border-transparent hover:text-white'
                }`}
                onClick={() => setShowHistory(true)}
                data-testid="history-tab"
              >
                History
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-500 font-medium">
                    <th className="p-3 font-normal">Asset</th>
                    <th className="p-3 font-normal">Type</th>
                    <th className="p-3 font-normal">Strike Price</th>
                    <th className="p-3 font-normal">Current Price</th>
                    <th className="p-3 font-normal">Amount</th>
                    <th className="p-3 font-normal">{showHistory ? 'Result' : 'Time Left'}</th>
                    <th className="p-3 font-normal text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(showHistory ? tradeHistory : openTrades).slice(0, 10).map(trade => {
                    const timeLeft = trade.status === 'open' 
                      ? Math.max(0, Math.floor((new Date(trade.expiry_time) - new Date()) / 1000))
                      : 0;
                    
                    const formatTime = (seconds) => {
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    };
                    
                    return (
                      <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${trade.direction === 'call' ? 'bg-neon' : 'bg-vibrant'}`}></div>
                          {trade.asset}
                        </td>
                        <td className={`p-3 ${trade.direction === 'call' ? 'text-neon' : 'text-vibrant'}`}>
                          {trade.direction.toUpperCase()}
                        </td>
                        <td className="p-3 font-mono">{trade.strike_price?.toFixed(2)}</td>
                        <td className="p-3 font-mono">{trade.close_price?.toFixed(2) || '-'}</td>
                        <td className="p-3 font-mono">${trade.amount.toFixed(2)}</td>
                        <td className="p-3 font-mono text-gray-400">
                          {showHistory 
                            ? (trade.profit >= 0 ? '+' : '') + '$' + trade.profit?.toFixed(2)
                            : formatTime(timeLeft)
                          }
                        </td>
                        <td className={`p-3 text-right ${
                          trade.status === 'open' ? 'text-amber' :
                          trade.status === 'won' ? 'text-neon' : 'text-vibrant'
                        }`}>
                          {trade.status === 'won' && `+$${(trade.amount * trade.payout_rate).toFixed(2)}`}
                          {trade.status === 'lost' && `-$${trade.amount.toFixed(2)}`}
                          {trade.status === 'open' && 'Active'}
                        </td>
                      </tr>
                    );
                  })}
                  {(showHistory ? tradeHistory : openTrades).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        {showHistory ? 'No trade history yet' : 'No open trades'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chat Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              className="absolute bottom-16 right-0 w-80 h-96 glass-panel rounded-xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
            >
              <div className="p-3 border-b border-white/10 flex justify-between items-center bg-space-light">
                <span className="text-sm font-medium text-white">AI Assistant</span>
                <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Ask me anything about trading!</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-electric text-white' 
                        : 'bg-white/10 text-gray-200'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={sendChatMessage} className="p-3 border-t border-white/10 bg-space-light">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow input-field text-sm py-2"
                    data-testid="chat-input"
                  />
                  <button 
                    type="submit" 
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 rounded-lg bg-electric text-white disabled:opacity-50"
                    data-testid="chat-send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-electric to-neon flex items-center justify-center shadow-lg hover:shadow-[0_0_20px_rgba(42,245,255,0.4)] transition-all"
          data-testid="chat-toggle"
        >
          {chatOpen ? <X className="w-5 h-5 text-space" /> : <MessageCircle className="w-5 h-5 text-space" />}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
