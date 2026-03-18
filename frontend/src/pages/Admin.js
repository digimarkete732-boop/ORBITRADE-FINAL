import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, TrendingUp, DollarSign, AlertTriangle, 
  Shield, Settings, PieChart, Wallet, 
  CheckCircle, XCircle, Clock, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import api from '../services/api';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls state
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [depositsEnabled, setDepositsEnabled] = useState(true);
  const [maxPayout, setMaxPayout] = useState(85);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsRes, usersRes, tradesRes, withdrawalsRes, assetsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/trades'),
        api.get('/api/admin/withdrawals'),
        api.get('/api/admin/assets')
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTrades(tradesRes.data);
      setWithdrawals(withdrawalsRes.data);
      setAssets(assetsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, data) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, data);
      toast.success('User updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const processWithdrawal = async (withdrawalId, status) => {
    try {
      await api.patch(`/api/admin/withdrawals/${withdrawalId}`, { status });
      toast.success(`Withdrawal ${status}`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to process withdrawal');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col pt-16">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-electric border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16" data-testid="admin-page">
      <Navbar />
      
      <main className="flex-grow p-4 max-w-[1600px] mx-auto w-full">
        <div className="flex gap-4">
          {/* Sidebar */}
          <div className="w-64 glass-panel rounded-xl hidden md:flex flex-col shrink-0">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-electric font-display font-medium">
              <Shield className="w-5 h-5" /> Admin Panel
            </div>
            <div className="flex-grow p-2 space-y-1">
              {[
                { id: 'overview', icon: PieChart, label: 'Overview' },
                { id: 'users', icon: Users, label: 'Users' },
                { id: 'risk', icon: AlertTriangle, label: 'Risk Management' },
                { id: 'financials', icon: Wallet, label: 'Financials' },
                { id: 'settings', icon: Settings, label: 'System Config' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                    activeTab === item.id
                      ? 'bg-electric/10 text-electric'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                  data-testid={`admin-tab-${item.id}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow space-y-4">
            {/* Mobile Tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
              {['overview', 'users', 'risk', 'financials', 'settings'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                    activeTab === tab ? 'bg-electric text-white' : 'bg-space-light text-gray-400'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat-card border-t-electric">
                    <div className="text-xs text-gray-400 mb-1">Total Active Users</div>
                    <div className="text-2xl font-mono text-white">{stats?.active_users?.toLocaleString()}</div>
                    <div className="text-xs text-neon mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +5.2% this week
                    </div>
                  </div>
                  
                  <div className="stat-card border-t-neon">
                    <div className="text-xs text-gray-400 mb-1">24h Trading Volume</div>
                    <div className="text-2xl font-mono text-white">${stats?.daily_volume?.toLocaleString()}</div>
                    <div className="text-xs text-neon mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +12.4% vs avg
                    </div>
                  </div>
                  
                  <div className="stat-card border-t-vibrant">
                    <div className="text-xs text-gray-400 mb-1">Platform Revenue (24h)</div>
                    <div className="text-2xl font-mono text-white">${stats?.daily_revenue?.toLocaleString()}</div>
                    <div className="text-xs text-vibrant mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> From losing trades
                    </div>
                  </div>
                  
                  <div className="stat-card border-t-amber relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-amber/20 blur-xl rounded-full"></div>
                    <div className="text-xs text-gray-400 mb-1 relative z-10">Open Trades</div>
                    <div className="text-2xl font-mono text-amber relative z-10">{stats?.open_trades}</div>
                    <div className="text-xs text-amber mt-2 relative z-10">Active positions</div>
                  </div>
                </div>

                {/* Recent Users & Trades */}
                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Recent Users */}
                  <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-white">Recent Registrations</h3>
                      <button 
                        className="text-xs text-electric"
                        onClick={() => setActiveTab('users')}
                      >
                        View All
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-white/5">
                            <th className="p-3 font-normal">User</th>
                            <th className="p-3 font-normal">KYC</th>
                            <th className="p-3 font-normal text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {users.slice(0, 5).map((user, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                              <td className="p-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-electric/20 text-electric flex items-center justify-center text-xs">
                                  {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <div className="text-white">{user.email?.split('@')[0]}...</div>
                                  <div className="text-[10px] text-gray-500">ID: {user.id?.slice(-6)}</div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`badge ${
                                  user.kyc_status === 'verified' ? 'badge-success' :
                                  user.kyc_status === 'pending' ? 'badge-warning' : 'badge-info'
                                }`}>
                                  {user.kyc_status}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono">${user.balance?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick Controls */}
                  <div className="glass-panel rounded-xl p-4">
                    <h3 className="text-sm font-medium text-white mb-4">Quick Controls</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-white">Trading Engine</div>
                          <div className="text-xs text-gray-500">Enable/disable order matching</div>
                        </div>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={tradingEnabled}
                            onChange={(e) => setTradingEnabled(e.target.checked)}
                          />
                          <div className="toggle-slider"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-white">Deposits</div>
                          <div className="text-xs text-gray-500">Accept incoming funds</div>
                        </div>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={depositsEnabled}
                            onChange={(e) => setDepositsEnabled(e.target.checked)}
                          />
                          <div className="toggle-slider"></div>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <div className="text-sm text-white mb-2">Global Max Payout</div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="60" 
                            max="95" 
                            value={maxPayout}
                            onChange={(e) => setMaxPayout(parseInt(e.target.value))}
                            className="flex-grow"
                          />
                          <span className="font-mono text-xs text-electric">{maxPayout}%</span>
                        </div>
                      </div>
                      
                      <button className="w-full mt-4 py-2 rounded border border-vibrant/50 text-vibrant text-sm hover:bg-vibrant/10 transition flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Emergency Stop
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">User Management</h3>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="input-field pl-9 py-1.5 text-sm w-48"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-white/5">
                          <th className="p-3 font-normal">User</th>
                          <th className="p-3 font-normal">Status</th>
                          <th className="p-3 font-normal">KYC</th>
                          <th className="p-3 font-normal">Balance</th>
                          <th className="p-3 font-normal">Joined</th>
                          <th className="p-3 font-normal text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {users.map((user, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                                  user.is_admin ? 'bg-vibrant/20 text-vibrant' : 'bg-electric/20 text-electric'
                                }`}>
                                  {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <div className="text-white">{user.full_name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`badge ${
                                user.status === 'active' ? 'badge-success' : 'badge-danger'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`badge ${
                                user.kyc_status === 'verified' ? 'badge-success' :
                                user.kyc_status === 'pending' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {user.kyc_status}
                              </span>
                            </td>
                            <td className="p-3 font-mono">${user.balance?.toFixed(2)}</td>
                            <td className="p-3 text-gray-400">{formatDate(user.created_at)}</td>
                            <td className="p-3 text-right">
                              <div className="flex gap-2 justify-end">
                                {user.kyc_status === 'pending' && (
                                  <button 
                                    className="text-xs text-neon hover:underline"
                                    onClick={() => updateUser(user.id, { kyc_status: 'verified' })}
                                  >
                                    Verify
                                  </button>
                                )}
                                <button 
                                  className="text-xs text-gray-400 hover:text-white"
                                  onClick={() => updateUser(user.id, { 
                                    status: user.status === 'active' ? 'suspended' : 'active' 
                                  })}
                                >
                                  {user.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Risk Tab */}
            {activeTab === 'risk' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5">
                    <h3 className="text-lg font-medium text-white">Active Trades Monitor</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-white/5">
                          <th className="p-3 font-normal">User</th>
                          <th className="p-3 font-normal">Asset</th>
                          <th className="p-3 font-normal">Direction</th>
                          <th className="p-3 font-normal">Amount</th>
                          <th className="p-3 font-normal">Strike</th>
                          <th className="p-3 font-normal">Expiry</th>
                          <th className="p-3 font-normal text-right">Potential Loss</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {trades.filter(t => t.status === 'open').slice(0, 10).map((trade, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3 text-gray-400">{trade.user_id?.slice(-6)}</td>
                            <td className="p-3 text-white">{trade.asset}</td>
                            <td className={`p-3 ${trade.direction === 'call' ? 'text-neon' : 'text-vibrant'}`}>
                              {trade.direction.toUpperCase()}
                            </td>
                            <td className="p-3 font-mono">${trade.amount.toFixed(2)}</td>
                            <td className="p-3 font-mono">{trade.strike_price?.toFixed(2)}</td>
                            <td className="p-3 text-gray-400">{formatDate(trade.expiry_time)}</td>
                            <td className="p-3 text-right font-mono text-amber">
                              ${(trade.amount * trade.payout_rate).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {trades.filter(t => t.status === 'open').length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500">
                              No open trades
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Financials Tab */}
            {activeTab === 'financials' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">Pending Withdrawals</h3>
                    <span className="badge badge-warning">
                      {withdrawals.filter(w => w.status === 'pending').length} pending
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-white/5">
                          <th className="p-3 font-normal">User</th>
                          <th className="p-3 font-normal">Amount</th>
                          <th className="p-3 font-normal">Method</th>
                          <th className="p-3 font-normal">Requested</th>
                          <th className="p-3 font-normal">Status</th>
                          <th className="p-3 font-normal text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {withdrawals.map((w, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3 text-gray-400">{w.user_id?.slice(-8)}</td>
                            <td className="p-3 font-mono text-white">${w.amount.toFixed(2)}</td>
                            <td className="p-3 text-gray-400 capitalize">{w.method}</td>
                            <td className="p-3 text-gray-400">{formatDate(w.created_at)}</td>
                            <td className="p-3">
                              <span className={`badge ${
                                w.status === 'approved' ? 'badge-success' :
                                w.status === 'pending' ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {w.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {w.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    className="p-1.5 rounded bg-neon/10 text-neon hover:bg-neon/20"
                                    onClick={() => processWithdrawal(w.id, 'approved')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded bg-vibrant/10 text-vibrant hover:bg-vibrant/20"
                                    onClick={() => processWithdrawal(w.id, 'rejected')}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {withdrawals.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500">
                              No withdrawal requests
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="glass-panel rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Asset Configuration</h3>
                  <div className="space-y-3">
                    {assets.slice(0, 10).map((asset, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-space-light">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${asset.is_active ? 'bg-neon' : 'bg-gray-500'}`}></div>
                          <div>
                            <div className="text-sm text-white">{asset.symbol}</div>
                            <div className="text-xs text-gray-500">{asset.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-electric font-mono">{(asset.payout_rate * 100).toFixed(0)}%</div>
                            <div className="text-xs text-gray-500">Payout</div>
                          </div>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={asset.is_active}
                              onChange={() => {}}
                            />
                            <div className="toggle-slider"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
