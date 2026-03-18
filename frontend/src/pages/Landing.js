import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe,
  ChevronRight,
  BarChart3,
  Wallet,
  Users
} from 'lucide-react';
import Navbar from '../components/Navbar';

const Landing = () => {
  const stats = [
    { value: '124,583', label: 'Active Traders' },
    { value: '$4.2B+', label: 'Quarterly Vol' },
    { value: '<12ms', label: 'Execution Speed' },
    { value: '99.99%', label: 'Uptime' }
  ];

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Multi-Asset Trading',
      description: 'Trade Forex, Crypto, and Precious Metals from a single platform with competitive payouts up to 92%.'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Microsecond Execution',
      description: 'State-of-the-art trading engine ensures your trades are executed in under 12ms.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Bank-Grade Security',
      description: 'Enterprise security with 2FA, encrypted transactions, and cold storage for crypto assets.'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Markets 24/7',
      description: 'Access forex markets during trading hours and crypto/metals markets around the clock.'
    }
  ];

  const assetTypes = [
    { name: 'Forex', pairs: '50+ Pairs', icon: '💱', color: 'electric' },
    { name: 'Crypto', pairs: '30+ Coins', icon: '₿', color: 'neon' },
    { name: 'Metals', pairs: '4 Assets', icon: '🥇', color: 'amber' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="flex-grow flex flex-col items-center justify-center px-4 relative perspective-1000 pt-24 pb-16">
        {/* 3D Background Elements */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden preserve-3d">
          <motion.div 
            className="w-[800px] h-[800px] border border-white/5 rounded-full absolute"
            style={{ transform: 'rotateX(60deg)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            className="w-[600px] h-[600px] border border-electric/20 rounded-full absolute shadow-[0_0_50px_rgba(58,134,255,0.1)_inset]"
            style={{ transform: 'rotateX(60deg)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Floating Chart */}
          <motion.div 
            className="absolute right-[10%] top-[20%] w-48 h-32 glass-panel rounded-lg p-4 flex items-end gap-2 opacity-50 hidden lg:flex"
            style={{ transform: 'rotateY(-10deg)' }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-full bg-electric/40 h-[40%] rounded-t-sm"></div>
            <div className="w-full bg-neon/40 h-[70%] rounded-t-sm"></div>
            <div className="w-full bg-vibrant/40 h-[30%] rounded-t-sm"></div>
            <div className="w-full bg-neon/60 h-[90%] rounded-t-sm shadow-[0_0_10px_#2AF5FF]"></div>
          </motion.div>
        </div>

        <div className="z-10 text-center max-w-4xl mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse"></span>
            <span className="text-xs font-medium text-gray-300">Platform v3.0 is live</span>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-7xl font-display font-semibold tracking-tighter text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Master the markets with <br className="hidden md:block" />
            <span className="text-gradient">absolute precision.</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Institutional-grade binary options trading. Advanced charting, microsecond execution, 
            and transparent pricing in a stunning Web3 environment.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/auth" className="btn-primary flex items-center gap-2 group" data-testid="start-trading-btn">
              Start Trading
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth?demo=true" className="btn-secondary" data-testid="demo-account-btn">
              Open Demo Account
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="font-mono text-2xl text-white font-medium mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-4">
              Why Traders Choose ORBITAL
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built for professional traders who demand speed, security, and reliability.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="glass-panel-hover rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-lg bg-electric/10 flex items-center justify-center text-electric mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Asset Types Section */}
      <section className="py-20 px-4 bg-space-light/50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-4">
              Trade Multiple Asset Classes
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Diversify your portfolio with access to forex, cryptocurrencies, and precious metals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {assetTypes.map((asset, index) => (
              <motion.div 
                key={index}
                className={`glass-panel rounded-xl p-8 text-center border-t-2 border-t-${asset.color}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-5xl mb-4">{asset.icon}</div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">{asset.name}</h3>
                <p className="text-gray-400 mb-4">{asset.pairs}</p>
                <div className={`inline-flex items-center text-sm text-${asset.color} hover:underline cursor-pointer`}>
                  View Markets <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-6">
              Ready to Start Trading?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of traders already using ORBITAL. Open your account in minutes 
              and get access to professional-grade trading tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth" className="btn-primary flex items-center gap-2" data-testid="create-account-btn">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric to-neon flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-space" />
                </div>
                <span className="font-display font-semibold text-white">ORBITAL</span>
              </div>
              <p className="text-sm text-gray-500">
                Next-generation binary options trading platform for professional traders.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-4">Trading</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer">Forex</li>
                <li className="hover:text-white cursor-pointer">Cryptocurrencies</li>
                <li className="hover:text-white cursor-pointer">Precious Metals</li>
                <li className="hover:text-white cursor-pointer">Economic Calendar</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer">Help Center</li>
                <li className="hover:text-white cursor-pointer">Trading Guides</li>
                <li className="hover:text-white cursor-pointer">API Documentation</li>
                <li className="hover:text-white cursor-pointer">Contact Us</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer">Terms of Service</li>
                <li className="hover:text-white cursor-pointer">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer">Risk Disclosure</li>
                <li className="hover:text-white cursor-pointer">AML Policy</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2026 ORBITAL Trading. All rights reserved.
            </p>
            <p className="text-xs text-gray-600 max-w-xl text-center md:text-right">
              Risk Warning: Binary options trading involves substantial risk and may not be suitable 
              for all investors. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
