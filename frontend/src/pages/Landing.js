import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import { 
  ArrowRight, TrendingUp, Shield, Zap, Trophy, Users, 
  Clock, DollarSign, BarChart3, Globe, Star, ChevronRight,
  Target, Cpu, Lock, Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

// Animated counter component
const AnimatedCounter = ({ value, suffix = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = React.useState(0);
  
  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Feature card with animation
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    className="feature-card group"
  >
    <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-5 group-hover:bg-brand/20 transition-colors">
      <Icon className="w-7 h-7 text-brand" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

// Testimonial card
const TestimonialCard = ({ name, role, content, rating, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-panel border border-white/5 rounded-2xl p-6 hover:border-brand/20 transition-all"
  >
    <div className="flex gap-1 mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
    <p className="text-gray-300 text-sm leading-relaxed mb-4">"{content}"</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold">
        {name[0]}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="text-xs text-gray-500">{role}</div>
      </div>
    </div>
  </motion.div>
);

const Landing = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  // Real-time prices state
  const [livePrices, setLivePrices] = useState([
    { symbol: 'BTC/USD', price: '-.--', change: '--%', up: true },
    { symbol: 'ETH/USD', price: '-.--', change: '--%', up: true },
    { symbol: 'EUR/USD', price: '-.--', change: '--%', up: false },
    { symbol: 'XAU/USD', price: '-.--', change: '--%', up: true },
    { symbol: 'GBP/USD', price: '-.--', change: '--%', up: true },
    { symbol: 'SOL/USD', price: '-.--', change: '--%', up: true },
  ]);

  // Fetch real prices from API
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await api.get('/api/prices');
        const data = response.data;
        
        const cryptoMap = {
          'BTC/USD': 'bitcoin',
          'ETH/USD': 'ethereum',
          'SOL/USD': 'solana'
        };
        
        const updatedPrices = [
          // Crypto
          {
            symbol: 'BTC/USD',
            price: data.crypto?.bitcoin?.usd?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-.--',
            change: `${data.crypto?.bitcoin?.usd_24h_change >= 0 ? '+' : ''}${data.crypto?.bitcoin?.usd_24h_change?.toFixed(1) || 0}%`,
            up: (data.crypto?.bitcoin?.usd_24h_change || 0) >= 0
          },
          {
            symbol: 'ETH/USD',
            price: data.crypto?.ethereum?.usd?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-.--',
            change: `${data.crypto?.ethereum?.usd_24h_change >= 0 ? '+' : ''}${data.crypto?.ethereum?.usd_24h_change?.toFixed(1) || 0}%`,
            up: (data.crypto?.ethereum?.usd_24h_change || 0) >= 0
          },
          // Forex
          {
            symbol: 'EUR/USD',
            price: data.forex?.['EUR/USD']?.price?.toFixed(4) || '-.--',
            change: `${data.forex?.['EUR/USD']?.change_24h >= 0 ? '+' : ''}${data.forex?.['EUR/USD']?.change_24h?.toFixed(2) || 0}%`,
            up: (data.forex?.['EUR/USD']?.change_24h || 0) >= 0
          },
          {
            symbol: 'GBP/USD',
            price: data.forex?.['GBP/USD']?.price?.toFixed(4) || '-.--',
            change: `${data.forex?.['GBP/USD']?.change_24h >= 0 ? '+' : ''}${data.forex?.['GBP/USD']?.change_24h?.toFixed(2) || 0}%`,
            up: (data.forex?.['GBP/USD']?.change_24h || 0) >= 0
          },
          // Metals
          {
            symbol: 'XAU/USD',
            price: data.metals?.['XAU/USD']?.price?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-.--',
            change: `${data.metals?.['XAU/USD']?.change_24h >= 0 ? '+' : ''}${data.metals?.['XAU/USD']?.change_24h?.toFixed(2) || 0}%`,
            up: (data.metals?.['XAU/USD']?.change_24h || 0) >= 0
          },
          // Crypto
          {
            symbol: 'SOL/USD',
            price: data.crypto?.solana?.usd?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '-.--',
            change: `${data.crypto?.solana?.usd_24h_change >= 0 ? '+' : ''}${data.crypto?.solana?.usd_24h_change?.toFixed(1) || 0}%`,
            up: (data.crypto?.solana?.usd_24h_change || 0) >= 0
          },
        ];
        
        setLivePrices(updatedPrices);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: BarChart3, title: 'Binary Options Trading', description: 'Trade forex, crypto, and metals with up to 95% returns. Simple Buy/Sell predictions with 5-60 second expiry times.' },
    { icon: Cpu, title: 'AI-Powered Predictions', description: 'Advanced GPT-5.2 AI analyzes market trends and provides real-time trading signals with confidence scores.' },
    { icon: Target, title: 'Touch/No Touch Options', description: 'Predict if price will touch a target level. More ways to profit from market movements.' },
    { icon: Shield, title: 'Secure & Regulated', description: 'Bank-grade encryption, KYC verification, and instant crypto deposits. Your funds are always safe.' },
    { icon: Trophy, title: 'Trading Tournaments', description: 'Compete weekly for prize pools up to $10,000. Climb the leaderboard and prove your skills.' },
    { icon: Users, title: 'Affiliate Program', description: 'Earn up to 10% commission on referrals. Multi-tier program with revenue sharing on trading profits.' },
  ];

  const stats = [
    { value: 50000, suffix: '+', label: 'Active Traders' },
    { value: 95, suffix: '%', label: 'Max Payout' },
    { value: 24, suffix: '/7', label: 'Support' },
    { value: 150, suffix: '+', label: 'Assets' },
  ];

  const testimonials = [
    { name: 'Michael Chen', role: 'Professional Trader', content: 'The AI predictions are incredibly accurate. I\'ve increased my win rate by 40% since joining ORBITRADE.', rating: 5 },
    { name: 'Sarah Johnson', role: 'Crypto Enthusiast', content: 'Finally a platform that combines simplicity with professional tools. The mobile app is flawless.', rating: 5 },
    { name: 'David Williams', role: 'Day Trader', content: 'Fast execution, great payouts, and the tournament feature keeps me coming back. Highly recommended!', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-app overflow-x-hidden">
      <Navbar />
      
      {/* Price Ticker */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-panel/80 backdrop-blur-xl border-b border-white/5">
        <Marquee gradient={false} speed={40} pauseOnHover>
          <div className="flex items-center gap-8 py-2 px-4">
            {[...livePrices, ...livePrices].map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-white">{p.symbol}</span>
                <span className="font-mono text-gray-300">{p.price}</span>
                <span className={`font-mono text-xs ${p.up ? 'text-buy' : 'text-sell'}`}>{p.change}</span>
              </div>
            ))}
          </div>
        </Marquee>
      </div>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden"
      >
        {/* Background Image & Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=2000&q=80" 
            alt="Trading Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-app/50 via-app/80 to-app" />
          <div className="absolute inset-0 hero-gradient" />
        </div>
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-buy/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-medium mb-6">
              <Zap className="w-4 h-4" /> AI-Powered Trading Platform
            </span>
          </motion.div>
          
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Trade Smarter with<br />
            <span className="text-gradient-brand">ORBITRADE</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Binary options trading with AI predictions, real-time market data, 
            and up to 95% returns. Join 50,000+ traders worldwide.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <button 
              onClick={() => navigate(token ? '/dashboard' : '/auth')}
              className="group px-8 py-4 rounded-xl bg-brand text-white font-bold text-base hover:bg-brand-hover transition-all hover:shadow-[0_0_40px_rgba(0,188,212,0.4)] flex items-center gap-2"
              data-testid="cta-start-trading"
            >
              Start Trading Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base hover:bg-white/10 transition-all flex items-center gap-2"
              data-testid="cta-demo"
            >
              <DollarSign className="w-5 h-5" />
              $10,000 Demo Account
            </button>
          </motion.div>
          
          {/* Trust Badges */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-6 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4 text-buy" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4 text-brand" />
              <span>Instant Withdrawals</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>KYC Verified</span>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-brand rounded-full" />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-2xl bg-panel/50 border border-white/5"
              >
                <div className="text-3xl sm:text-4xl font-bold text-brand mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative" data-testid="features-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand mb-4 block">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Everything You Need to<br />
              <span className="text-gradient-brand">Trade Profitably</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Professional-grade tools, AI insights, and a seamless trading experience designed for both beginners and experts.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} delay={idx * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-panel/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand mb-4 block">Getting Started</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start Trading in Minutes</h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up in 30 seconds. No lengthy verification for demo trading.' },
              { step: '02', title: 'Fund or Demo', desc: 'Deposit crypto instantly or start with $10,000 demo balance.' },
              { step: '03', title: 'Start Trading', desc: 'Choose an asset, predict direction, and earn up to 95% returns.' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                viewport={{ once: true }}
                className="relative text-center p-8"
              >
                <div className="text-6xl font-bold text-brand/10 absolute top-4 left-1/2 -translate-x-1/2">{item.step}</div>
                <div className="relative z-10 pt-8">
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand mb-4 block">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Trusted by Traders Worldwide</h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <TestimonialCard key={idx} {...t} delay={idx * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-buy/10" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Start Trading?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of traders who are already profiting with ORBITRADE. 
              Start with a free demo account today.
            </p>
            <button 
              onClick={() => navigate('/auth')}
              className="px-10 py-5 rounded-xl bg-brand text-white font-bold text-lg hover:bg-brand-hover transition-all hover:shadow-[0_0_50px_rgba(0,188,212,0.5)] inline-flex items-center gap-3"
              data-testid="cta-final"
            >
              Create Free Account
              <ArrowRight className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <Link to="/" className="text-2xl font-bold text-white">
                <span className="text-brand">O</span>RBITAL
              </Link>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                AI-powered binary options trading platform with real-time market data and professional tools.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Trading</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/auth" className="hover:text-white transition-colors">Binary Options</Link></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Touch/No Touch</Link></li>
                <li><Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Affiliate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Help Center</li>
                <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
                <li className="hover:text-white cursor-pointer transition-colors">FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/legal/risk" className="hover:text-white transition-colors">Risk Disclosure</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© 2026 ORBITRADE Trading. All rights reserved.</p>
            <p className="text-xs text-gray-600 max-w-xl text-center md:text-right">
              <span className="text-sell">Risk Warning:</span> Binary options trading involves substantial risk and may not be suitable for all investors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
