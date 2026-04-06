# ORBITRADE Trading Platform - PRD

## Overview
Professional Binary Options Trading Platform with AI predictions, tournaments, and complete admin controls.

## Tech Stack
- **Backend**: Python FastAPI + Socket.IO + MongoDB
- **Frontend**: React 18 + TailwindCSS + Framer Motion + Lenis
- **Charts**: TradingView Lightweight Charts
- **AI**: OpenAI GPT-5.2 (via Emergent LLM)
- **Real-time**: WebSocket for price feeds

## Design System
- **Background**: #080808 (app) / #121212 (panel) / #1A1A1A (elevated)
- **Brand**: #00BCD4 (cyan) with #26C6DA hover
- **Buy/Win**: #00BFA5 (teal green)
- **Sell/Lose**: #E53935 (red)
- **Fonts**: Outfit (headings), IBM Plex Sans (body), IBM Plex Mono (numbers)

## All Features Implemented

### Core Trading Features
- [x] Binary Options (BUY/SELL High/Low)
- [x] Touch/No Touch trading
- [x] 5-60 second expiry with countdown timer
- [x] Real-time price feeds (Forex, Crypto, Metals) - **LIVE DATA**
- [x] AI trading predictions with GPT-5.2
- [x] Platform win rate control

### Price Feeds (LIVE - April 2026)
- [x] Crypto prices via jsdelivr currency API (BTC, ETH, SOL, etc.)
- [x] Forex prices via currency API (EUR/USD, GBP/USD, etc.)
- [x] Metals prices via currency API (XAU/USD, XAG/USD)
- [x] Hero section price ticker with real-time updates

### AI Features (WORKING - April 2026)
- [x] AI Chat with GPT-5.2 (trading assistant)
- [x] AI Predictions with buy/sell confidence scores
- [x] Emergent LLM integration

### Real-time Features (April 2026)
- [x] WebSocket with auto-reconnection
- [x] Push notification service worker
- [x] Real-time trade settlement notifications

### Admin Panel
- [x] Overview dashboard with stats
- [x] User management (search, edit, balance adjust, KYC)
- [x] Deposit/Withdrawal management
- [x] Win Rate Control (platform house edge)
- [x] Tournament management
- [x] Commission structure settings
- [x] Payment settings
- [x] Broadcast notifications

### Payment System
- [x] Manual Crypto Deposit
- [x] Deposit Bonus with wagering requirements
- [x] Withdrawal requests
- [x] Stripe integration

### Additional Features
- [x] Trading Tournaments with leaderboards
- [x] Affiliate System (3-tier commissions)
- [x] Legal Pages (ToS, Privacy, Risk)
- [x] 2FA Authentication (TOTP)
- [x] KYC Document Upload
- [x] PWA Support with install prompt

## Test Accounts
| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@orbitrade.live | password |
| User | masteruser@orbitrade.live | password |

## Recent Fixes (2026-04-06)
1. ✅ Fixed crypto prices - now using jsdelivr currency API
2. ✅ Fixed hero price ticker - shows real-time live prices
3. ✅ Fixed AI Chat - working with Emergent LLM GPT-5.2
4. ✅ Fixed AI Predictions - returns buy/sell confidence
5. ✅ Improved WebSocket - better reconnection handling
6. ✅ Added Push Notifications - service worker implemented

## Pending Tasks

### P1 (High Priority)
- [ ] Session persistence improvement
- [ ] Refactor server.py into modular routes

### P2 (Medium Priority)
- [ ] SendGrid email for password reset
- [ ] S3 storage for KYC documents
- [ ] Trade history CSV/PDF export
- [ ] Affiliate payout system

### P3 (Nice to Have)
- [ ] Mobile app (React Native)
- [ ] Advanced charting indicators

## Date: 2026-04-06 (Live Prices & AI Features Fixed)
