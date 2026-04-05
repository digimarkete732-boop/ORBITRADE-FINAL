# ORBITAL Trading Platform - PRD

## Overview
Binary Options Trading Platform with full production features: real market data, AI predictions, tournaments, and admin controls.

## Tech Stack
- **Backend**: Python FastAPI + Socket.IO + MongoDB
- **Frontend**: React 18 + TailwindCSS + Framer Motion
- **Charts**: TradingView Lightweight Charts
- **AI**: OpenAI GPT-5.2 (via Emergent LLM)
- **Real-time**: WebSocket for price feeds

## Core Features (All Implemented)

### Trading System
- [x] Binary Options trading (BUY/SELL High/Low)
- [x] Touch/No Touch trading options
- [x] 5-60 second expiry timeframes
- [x] Trade settlement with ACTUAL market prices (with platform win rate control)
- [x] Real-time price feeds (Forex, Crypto, Metals)
- [x] AI trading predictions

### Payment System
- [x] Manual Crypto Deposit with blockchain confirmation animation
- [x] Cryptocurrency options: USDT TRC20/ERC20, BTC, ETH, LTC
- [x] Deposit Bonus System with wagering requirements (30x default)
- [x] Withdrawal requests with wallet address
- [x] Admin notifications for all deposit/withdrawal requests

### Platform Win Rate Control (House Edge)
- [x] Admin can set user win rate (20-70%)
- [x] House edge automatically calculated
- [x] Per-asset override support
- [x] Real-time application to trade settlements

### Trading Tournaments
- [x] Weekly/Daily/Monthly tournaments
- [x] Prize pool configuration
- [x] Real-time leaderboard (ranked by profit)
- [x] Free entry, participants tracked
- [x] Auto-update stats on trades

### Affiliate System
- [x] Direct Commission: 5% on deposits
- [x] Indirect Commission: 2% on downline (3 levels)
- [x] Revenue Share: 10% on trading profits
- [x] Admin-controlled commission structure

### Push Notifications
- [x] Trade settlement notifications
- [x] Deposit bonus notifications
- [x] Admin alerts for deposits/withdrawals
- [x] WebSocket real-time delivery

### Legal Pages
- [x] Terms of Service
- [x] Privacy Policy
- [x] Risk Disclosure
- Full content with all required sections

### Admin Panel
- [x] User management
- [x] KYC Document viewer
- [x] Deposit/Withdrawal management
- [x] Win Rate Control slider
- [x] Tournament creation
- [x] Commission structure editor
- [x] Promotion creation with wagering

## Test Accounts
| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@orbitrade.live | password |
| User | masteruser@orbitrade.live | password |

## API Endpoints (New)
- POST /api/admin/platform-settings - Win rate control
- GET/POST /api/tournaments - Tournament management
- POST /api/tournaments/{id}/join - Join tournament
- GET /api/tournaments/{id}/leaderboard - Get rankings
- GET /api/notifications - User notifications
- GET /api/bonuses/my - User bonus status

## Date: 2026-04-05
