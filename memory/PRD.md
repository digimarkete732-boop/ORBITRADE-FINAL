# ORBITAL Trading Platform - Product Requirements Document

## Executive Summary
**Project Name:** ORBITAL - Next-Generation Binary Options Trading Platform
**Version:** 1.0 MVP
**Last Updated:** March 18, 2026

## Original Problem Statement
Build a comprehensive binary options trading platform supporting Forex, Cryptocurrencies, and Precious Metals with:
- Full trading dashboard with real-time prices
- Admin dashboard for platform management
- Affiliate system for referral marketing
- Multi-payment support (Stripe, Crypto, Bank)
- AI-powered support chat

## User Choices & Decisions
- **Scope:** Full platform with Admin + Affiliate + Trading
- **Market Data:** CoinGecko (Crypto) + Simulated (Forex/Metals)
- **Payments:** Stripe + Manual Crypto + Bank Transfer
- **Real-time:** WebSocket for live prices
- **Authentication:** JWT with 2FA support
- **AI Chat:** GPT-5.2 via Emergent LLM Key

## Technical Architecture

### Backend Stack
- **Framework:** FastAPI (Python)
- **Database:** MongoDB
- **WebSocket:** python-socketio
- **Authentication:** JWT + PyOTP (2FA)
- **Payments:** Stripe Checkout (emergentintegrations)
- **AI:** GPT-5.2 (emergentintegrations)

### Frontend Stack
- **Framework:** React 18
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Real-time:** Socket.io-client
- **Charts:** Custom candlestick chart

## Core Requirements

### User System ✅
- [x] Email/Password registration
- [x] JWT authentication
- [x] 2FA setup (Google Authenticator)
- [x] Profile management
- [x] Balance tracking

### Trading Engine ✅
- [x] Multi-asset support (20 assets)
  - 8 Forex pairs
  - 8 Cryptocurrencies
  - 4 Precious Metals
- [x] Real-time price streaming (WebSocket)
- [x] Binary options (CALL/PUT)
- [x] Multiple expiry times (1min, 5min, 15min, 1hr)
- [x] Auto-settlement at expiry
- [x] P&L calculation

### Trading Interface ✅
- [x] Live candlestick chart
- [x] Asset selector with categories
- [x] Trade execution panel
- [x] Open positions tracker
- [x] Trade history

### Financial System ✅
- [x] Wallet balance display
- [x] Stripe deposits
- [x] Crypto deposits (addresses)
- [x] Withdrawal requests
- [x] Transaction history

### Admin Dashboard ✅
- [x] Platform statistics
- [x] User management
- [x] Trade monitoring
- [x] Withdrawal approvals
- [x] Asset configuration
- [x] Quick controls (toggles)

### Affiliate System ✅
- [x] Unique referral codes
- [x] Commission tracking
- [x] Referral list

### Support ✅
- [x] AI chat (GPT-5.2)
- [x] Chat history

## What's Been Implemented (v1.0)

### March 18, 2026 - Initial MVP
1. **Complete Backend API** (server.py)
   - 35+ API endpoints
   - WebSocket for real-time prices
   - Background tasks for trade settlement

2. **Full Frontend Application**
   - Landing page with animations
   - Auth pages (login/register)
   - Trading dashboard with chart
   - Admin panel (5 tabs)
   - Deposit/Withdraw pages
   - Affiliate dashboard
   - AI chat widget

3. **Database Models**
   - Users (with 2FA)
   - Trades
   - Transactions
   - Withdrawals
   - Assets
   - Chat messages
   - Affiliates

### Testing Results
- Backend: 100% (17/17 tests passed)
- Frontend: ~90% (core flows working)

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/2fa/setup
- POST /api/auth/2fa/verify

### Trading
- GET /api/assets
- GET /api/prices
- POST /api/trades
- GET /api/trades

### Financial
- GET /api/wallet
- GET /api/transactions
- POST /api/deposits/stripe/create-session
- POST /api/withdrawals

### Admin
- GET /api/admin/stats
- GET /api/admin/users
- PATCH /api/admin/users/{id}
- GET /api/admin/trades
- GET /api/admin/withdrawals

### AI Chat
- POST /api/chat
- GET /api/chat/history

## Prioritized Backlog

### P0 - Critical (Future)
- [ ] Real Forex/Metals API integration (Twelve Data)
- [ ] Email verification flow
- [ ] Production payment processing

### P1 - High Priority
- [ ] KYC document upload & verification
- [ ] Mobile-responsive improvements
- [ ] Advanced charting (TradingView integration)
- [ ] Email notifications (SendGrid)

### P2 - Medium Priority
- [ ] Social login (Google, Apple)
- [ ] PayPal integration
- [ ] Economic calendar
- [ ] Leaderboard page
- [ ] Advanced order types (Touch/No Touch)

### P3 - Nice to Have
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Advanced analytics
- [ ] API keys for users
- [ ] Mobile app preparation

## Mocked/Simulated Features
- **Forex prices:** Simulated with realistic ranges
- **Metals prices:** Simulated with realistic ranges
- **Crypto deposit addresses:** Static demo addresses

## Known Issues
- CoinGecko API rate limits (429 errors) - handled gracefully
- JWT session management - works but may need refresh token

## Security Implementation
- [x] Password hashing (bcrypt)
- [x] JWT token auth
- [x] 2FA support (TOTP)
- [x] CORS configuration
- [x] Rate limiting (built-in)

## Deployment Notes
- Backend: FastAPI on port 8001 (supervisor)
- Frontend: React on port 3000 (supervisor)
- Database: MongoDB (local)
- WebSocket: /api/socket.io

## Next Development Phase
1. Integrate real market data APIs
2. Add email verification
3. Implement KYC system
4. Production payment webhooks
5. Advanced trading features
