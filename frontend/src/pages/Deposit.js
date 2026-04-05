import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, AlertCircle, Upload, X, Hash, Clock, CheckCircle2, XCircle, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const CRYPTO_OPTIONS = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', network: 'Bitcoin (BTC)' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: '#627eea', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'Ethereum (ERC-20)' },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', color: '#26a17b', address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', network: 'Tron (TRC-20)' },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', color: '#bfbbbb', address: 'ltc1qg42tkwuuxefutzxezdkdp39qqww6crkkk2fmh3', network: 'Litecoin (LTC)' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', color: '#9945FF', address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', network: 'Solana (SOL)' },
];

const STATUS_MAP = {
  blockchain_confirming: { label: 'Confirming', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Loader2, spin: true },
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2, spin: false },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle, spin: false },
  pending: { label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Clock, spin: false },
};

/* ── Blockchain Confirmation Animated Overlay ── */
const BlockchainConfirmation = ({ crypto, amount, txHash, onDone }) => {
  const [step, setStep] = useState(0);
  const steps = [
    'Broadcasting transaction...',
    'Waiting for network nodes...',
    `Confirming on ${crypto.network}...`,
    'Verifying block hash...',
    'Deposit submitted for review',
  ];

  useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setStep(i), i * 1800)
    );
    const done = setTimeout(onDone, steps.length * 1800 + 800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      data-testid="blockchain-confirmation-overlay"
    >
      <div className="relative flex flex-col items-center max-w-sm w-full mx-4">
        {/* Animated rings */}
        <div className="relative w-40 h-40 mb-8">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{ borderColor: crypto.color + '44' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border-2"
            style={{ borderColor: crypto.color + '66' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-6 rounded-full border-2 border-dashed"
            style={{ borderColor: crypto.color + '88' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          {/* Pulsating center */}
          <motion.div
            className="absolute inset-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: crypto.color + '22' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: crypto.color }}>
              {crypto.symbol[0]}
            </div>
          </motion.div>
          {/* Orbiting dots */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: crypto.color, top: '50%', left: '50%' }}
              animate={{
                x: [0, Math.cos((i * 2 * Math.PI) / 3) * 65, 0],
                y: [0, Math.sin((i * 2 * Math.PI) / 3) * 65, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
            />
          ))}
        </div>

        {/* Amount */}
        <motion.div className="text-center mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <span className="text-3xl font-mono font-bold text-white">${amount}</span>
          <span className="text-sm text-gray-500 ml-2">{crypto.symbol}</span>
        </motion.div>

        {/* Steps progress */}
        <div className="w-full space-y-2.5 mb-6">
          {steps.map((label, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: i <= step ? 1 : 0.25, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                i < step ? 'bg-emerald-500' : i === step ? '' : 'bg-white/10'
              }`}
                style={i === step ? { backgroundColor: crypto.color } : undefined}
              >
                {i < step ? (
                  <Check className="w-3 h-3 text-white" />
                ) : i === step ? (
                  <motion.div className="w-2 h-2 rounded-full bg-white" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                )}
              </div>
              <span className={`text-xs font-medium transition-colors duration-300 ${
                i < step ? 'text-emerald-400' : i === step ? 'text-white' : 'text-gray-600'
              }`}>{label}</span>
            </motion.div>
          ))}
        </div>

        {/* Tx hash */}
        <div className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Transaction Hash</div>
          <div className="text-[11px] font-mono text-gray-400 truncate">{txHash}</div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main Deposit Page ── */
const Deposit = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_OPTIONS[0]);
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deposits, setDeposits] = useState([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);

  useEffect(() => { fetchDeposits(); }, []);

  const fetchDeposits = async () => {
    try {
      const res = await api.get('/api/deposits');
      setDeposits(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingDeposits(false); }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedCrypto.address);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size: 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result);
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleSubmit = async () => {
    if (!txHash.trim()) { toast.error('Enter transaction hash / Trx ID'); return; }
    if (!finalAmount || finalAmount < 10) { toast.error('Minimum deposit: $10'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/deposits', {
        amount: finalAmount,
        currency: selectedCrypto.symbol,
        tx_hash: txHash.trim(),
        screenshot: screenshot || null,
      });
      setShowConfirmation(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmationDone = () => {
    setShowConfirmation(false);
    setTxHash('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setCustomAmount('');
    fetchDeposits();
    toast.success('Deposit submitted! Awaiting admin review.');
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedCrypto.address)}&bgcolor=0d1220&color=ffffff`;

  return (
    <div className="min-h-screen bg-[#080c14]" data-testid="deposit-page">
      <Navbar />
      {showConfirmation && (
        <BlockchainConfirmation crypto={selectedCrypto} amount={finalAmount} txHash={txHash || '...'} onDone={onConfirmationDone} />
      )}

      <main className="pt-16 pb-8 px-3 sm:px-6 max-w-2xl mx-auto">
        <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Deposit Funds</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-10">Send crypto, then submit your transaction details below</p>

          {isDemoMode && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">Demo account — deposits credit your real balance.</p>
            </div>
          )}

          {/* ── Step 1: Select Crypto ── */}
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 sm:p-5 mb-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">1. Select Cryptocurrency</label>
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10 hover:border-white/20 transition-all"
                data-testid="crypto-selector">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: selectedCrypto.color }}>
                    {selectedCrypto.symbol[0]}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white">{selectedCrypto.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{selectedCrypto.symbol}</span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showDropdown && (
                  <motion.div className="absolute z-20 top-full mt-1 w-full bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {CRYPTO_OPTIONS.map(c => (
                      <button key={c.id}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${selectedCrypto.id === c.id ? 'bg-white/[0.04]' : ''}`}
                        onClick={() => { setSelectedCrypto(c); setShowDropdown(false); }}
                        data-testid={`crypto-${c.id}`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white" style={{ backgroundColor: c.color }}>
                          {c.symbol[0]}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">{c.name}</div>
                          <div className="text-[10px] text-gray-600">{c.network}</div>
                        </div>
                        {selectedCrypto.id === c.id && <Check className="w-4 h-4 text-electric ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Step 2: QR + Address ── */}
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 sm:p-5 mb-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 block">2. Send {selectedCrypto.symbol} to this address</label>
            <div className="flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-white mb-4" data-testid="qr-code">
                <img src={qrUrl} alt="QR Code" className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]" />
              </div>
              <p className="text-[10px] text-gray-600 mb-3">{selectedCrypto.network}</p>
              <div className="w-full flex items-center gap-2 bg-black/30 rounded-xl p-3 border border-white/10">
                <code className="flex-1 text-xs font-mono text-gray-300 break-all select-all" data-testid="wallet-address">
                  {selectedCrypto.address}
                </code>
                <button onClick={copyAddress}
                  className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  data-testid="copy-address-btn">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Step 3: Submit Transaction Details ── */}
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 sm:p-5 mb-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 block">3. Submit Transaction Details</label>

            {/* Amount */}
            <div className="mb-4">
              <label className="text-[10px] text-gray-500 mb-1.5 block">Amount (USD)</label>
              <div className="flex gap-1.5 mb-2">
                {[50, 100, 250, 500, 1000].map(a => (
                  <button key={a}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-mono font-bold transition-all ${
                      amount === a && !customAmount ? 'bg-electric text-white' : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                    data-testid={`amount-${a}`}
                    onClick={() => { setAmount(a); setCustomAmount(''); }}>${a}</button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Or enter custom amount..."
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 transition-colors"
                data-testid="custom-amount-input"
              />
            </div>

            {/* Transaction Hash */}
            <div className="mb-4">
              <label className="text-[10px] text-gray-500 mb-1.5 block">Transaction Hash / Trx ID *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="e.g. 0xabc123...def456"
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 font-mono transition-colors"
                  data-testid="tx-hash-input"
                />
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="mb-5">
              <label className="text-[10px] text-gray-500 mb-1.5 block">Payment Screenshot (optional)</label>
              {screenshotPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={screenshotPreview} alt="Receipt" className="w-full max-h-48 object-cover" data-testid="screenshot-preview" />
                  <button
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                    data-testid="remove-screenshot-btn">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer"
                  data-testid="upload-screenshot-btn">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-500">Click to upload screenshot</span>
                  <span className="text-[10px] text-gray-700">PNG, JPG up to 5MB</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} data-testid="file-input" />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !txHash.trim()}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                submitting || !txHash.trim()
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                  : 'text-white hover:shadow-lg hover:shadow-electric/20'
              }`}
              style={!submitting && txHash.trim() ? { backgroundColor: selectedCrypto.color } : undefined}
              data-testid="submit-deposit-btn">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><Upload className="w-4 h-4" /> Submit Deposit</>
              )}
            </button>
          </div>

          {/* ── Warning ── */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-amber-400 font-semibold">Important</p>
                <ul className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                  <li>Only send {selectedCrypto.symbol} on the {selectedCrypto.network} network</li>
                  <li>Submit your Trx ID after sending — deposits are verified by admin</li>
                  <li>Minimum deposit: $10 equivalent</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Deposit History ── */}
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Deposit History</h3>
              <span className="text-[10px] text-gray-600">{deposits.length} deposits</span>
            </div>
            {loadingDeposits ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-600" /></div>
            ) : deposits.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-xs">No deposits yet</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {deposits.map((d) => {
                  const st = STATUS_MAP[d.status] || STATUS_MAP.pending;
                  const StIcon = st.icon;
                  return (
                    <div key={d.id} className="px-4 py-3 flex items-center gap-3" data-testid={`deposit-row-${d.id}`}>
                      <div className={`w-8 h-8 rounded-lg ${st.bg} flex items-center justify-center shrink-0`}>
                        <StIcon className={`w-4 h-4 ${st.color} ${st.spin ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">${d.amount.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-600">{d.currency}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono truncate">{d.tx_hash}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                        <div className="text-[9px] text-gray-700">{new Date(d.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Deposit;
