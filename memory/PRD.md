# ORBITAL Trading Platform - Product Requirements Document

## Executive Summary
**Project Name:** ORBITAL - Next-Generation Binary Options Trading Platform
**Version:** 2.1 (P&L Tracker + Countdown Fix)
**Last Updated:** March 18, 2026

## Original Problem Statement
Build a comprehensive binary options trading platform supporting Forex, Cryptocurrencies, and Precious Metals with full trading functionality, AI-powered predictions, and professional-grade charts.

## Latest Updates (v2.1) - P&L Tracker + Countdown

### New in v2.1:
1. **Live P&L Tracker** - Daily/Weekly/Monthly profit tracking with clickable period toggle
2. **Win Rate Display** - Real-time win rate with W/L count
3. **Improved Live Countdown** - Decimal precision (e.g., 4.7s), 50ms updates, color-coded urgency (amber > orange > red with pulse)
4. **P&L Backend Endpoint** - GET /api/user/pnl returns aggregated trade performance data

### From v2.0:
1. AI-Powered BUY/SELL Predictions (GPT-5.2)
2. Live Metal Prices (fawazahmed0 currency API)
3. Interactive Chart Timeframes (1s, 5s, 1m, 5m, 15m, 1H)
4. Technical Indicators (SMA 20, EMA 9, Bollinger Bands)
5. Dashboard Redesign (dark, professional, scrolling ticker)

## Default Accounts
| Account Type | Email | Password |
|--------------|-------|----------|
| Admin | admin@orbitrade.live | password |
| Master User | masteruser@orbitrade.live | password |

## Technical Details

### P&L Tracker
- Endpoint: GET /api/user/pnl
- Returns: daily, weekly, monthly aggregates
- Fields: profit, wins, losses, total trades, win_rate
- Auto-refreshes every 10 seconds + after each trade settlement
- Clickable to toggle between Daily/Weekly/Monthly view

### Countdown Timer
- 50ms update interval for smooth countdown
- Decimal precision for sub-10s trades (e.g., "4.7s")
- Color coding: amber (>10s) → orange (3-10s) → red pulsing (<3s)
- Progress bar with smooth transition

### API Endpoints
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - Login
- GET `/api/user/me` - Current user
- GET `/api/user/pnl` - Daily/Weekly/Monthly P&L (NEW)
- GET `/api/assets` - All tradeable assets
- GET `/api/prices` - Live prices (forex, crypto, metals)
- POST `/api/trades` - Place trade
- GET `/api/trades` - Trade history
- POST `/api/predict` - AI prediction
- POST `/api/chat` - AI chat

## Testing Results (v2.1)
- Backend: **100%** (14/14 tests passed in v2.0 + P&L endpoint verified)
- Frontend: **100%** (18/18 features + P&L tracker + countdown verified)

## Upcoming Tasks
- P0: KYC Document Upload System
- P1: Email Notifications (SendGrid)
- P1: Touch/No Touch option types
- P2: PayPal payment integration
- P2: Backend refactoring (split server.py monolith)

## Known Limitations
- Metal prices from fawazahmed0 API may differ from TradingView (different data sources)
- CoinGecko crypto API rate-limited; falls back to cached data
- Payment gateways are placeholders
- True MT5 feed requires broker VPS connection (not possible without VPS)
