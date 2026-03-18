import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, Users, DollarSign, TrendingUp, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const Affiliate = () => {
  const { user } = useAuth();
  const [affiliateInfo, setAffiliateInfo] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    fetchAffiliateData();
  }, []);
  
  const fetchAffiliateData = async () => {
    try {
      const [infoRes, referralsRes] = await Promise.all([
        api.get('/api/affiliate'),
        api.get('/api/affiliate/referrals')
      ]);
      
      setAffiliateInfo(infoRes.data);
      setReferrals(referralsRes.data);
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const copyLink = () => {
    const link = `${window.location.origin}/auth?ref=${affiliateInfo?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
    <div className="min-h-screen flex flex-col pt-16" data-testid="affiliate-page">
      <Navbar />
      
      <main className="flex-grow p-4 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-semibold text-white mb-2">Affiliate Program</h1>
          <p className="text-gray-400 mb-8">Earn commissions by referring new traders</p>
          
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card border-t-electric">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <div className="text-2xl font-mono text-white">{affiliateInfo?.referrals || 0}</div>
                  <div className="text-xs text-gray-500">Total Referrals</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card border-t-neon">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-neon" />
                </div>
                <div>
                  <div className="text-2xl font-mono text-white">${(affiliateInfo?.earnings || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total Earnings</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card border-t-vibrant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-vibrant/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-vibrant" />
                </div>
                <div>
                  <div className="text-2xl font-mono text-white">{((affiliateInfo?.commission_rate || 0.10) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-gray-500">Commission Rate</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card border-t-amber">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-amber" />
                </div>
                <div>
                  <div className="text-lg font-mono text-white">{affiliateInfo?.code}</div>
                  <div className="text-xs text-gray-500">Your Code</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Referral Link */}
          <div className="glass-panel rounded-xl p-6 mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Your Referral Link</h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/auth?ref=${affiliateInfo?.code}`}
                className="input-field flex-grow font-mono text-sm"
                data-testid="referral-link"
              />
              <button
                onClick={copyLink}
                className="btn-primary flex items-center gap-2"
                data-testid="copy-link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Share this link with friends. When they sign up and trade, you earn commissions!
            </p>
          </div>
          
          {/* How It Works */}
          <div className="glass-panel rounded-xl p-6 mb-8">
            <h3 className="text-lg font-medium text-white mb-4">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-electric/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-electric font-bold">1</span>
                </div>
                <h4 className="text-white font-medium mb-1">Share Your Link</h4>
                <p className="text-sm text-gray-400">Share your unique referral link with friends and followers</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-neon font-bold">2</span>
                </div>
                <h4 className="text-white font-medium mb-1">They Sign Up</h4>
                <p className="text-sm text-gray-400">Your referrals create accounts and start trading</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-vibrant/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-vibrant font-bold">3</span>
                </div>
                <h4 className="text-white font-medium mb-1">Earn Commissions</h4>
                <p className="text-sm text-gray-400">Get 10% of the platform revenue from their trading activity</p>
              </div>
            </div>
          </div>
          
          {/* Referrals List */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-lg font-medium text-white">Your Referrals</h3>
            </div>
            
            {referrals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No referrals yet. Share your link to get started!</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-500">
                    <th className="p-3 text-left font-normal">User</th>
                    <th className="p-3 text-left font-normal">Joined</th>
                    <th className="p-3 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-sm text-white">{ref.email?.split('@')[0]}***</td>
                      <td className="p-3 text-sm text-gray-400">{formatDate(ref.created_at)}</td>
                      <td className="p-3 text-right">
                        <span className="badge badge-success">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Affiliate;
