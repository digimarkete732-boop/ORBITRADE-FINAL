# ORBITAL Trading Platform - Product Requirements Document

## Executive Summary
**Project Name:** ORBITAL - Next-Generation Binary Options Trading Platform
**Version:** 3.0 (Full Feature Set)
**Last Updated:** April 4, 2026

## Original Problem Statement
Build a comprehensive binary options trading platform supporting Forex, Cryptocurrencies, and Precious Metals with full trading functionality, AI-powered predictions, professional charts, user management, KYC, and admin controls.

## What's Been Built

### v3.0 — Profile, KYC, Admin Overhaul, Crypto Payments (April 4, 2026)
- **Profile Page** — Full user profile with edit, account details, KYC section
- **KYC Document Upload** — Upload ID front/back, selfie, proof of address
- **Crypto-Only Deposit** — QR codes for BTC, ETH, USDT, LTC, SOL (bank removed)
- **Crypto-Only Withdraw** — Wallet address input, demo mode blocked
- **Admin Panel Overhaul** — 5 tabs: Overview, Users, Withdrawals, Broadcast, Promotions
- **Admin: User Management** — Search, suspend/activate, adjust balance, approve/reject KYC
- **Admin: Broadcast** — Send notifications to all users
- **Admin: Promotions** — Create/manage deposit bonus promotions
- **Mobile Responsive** — All pages fully responsive with hamburger menu

### v2.1 — P&L Tracker + Countdown (March 18, 2026)
- Live P&L tracker (daily/weekly/monthly) with period toggle
- Win rate display with W/L count
- Improved countdown timer (50ms updates, decimal precision, color urgency)

### v2.0 — AI Dashboard Overhaul (March 18, 2026)
- AI-powered BUY/SELL predictions (GPT-5.2 via Emergent LLM)
- Live metal prices (fawazahmed0 currency API)
- Interactive chart timeframes (1s, 5s, 1m, 5m, 15m, 1H)
- Technical indicators (SMA 20, EMA 9, Bollinger Bands)
- Dashboard redesign with scrolling price ticker
- Demo/Real account system with toggle
- Account setup page after registration

### v1.0 — MVP (March 18, 2026)
- Full auth system (JWT, slide-to-verify)
- Trading engine (BUY/SELL, 5-60s expiry)
- TradingView Lightweight Charts
- Forex/Crypto/Metals asset categories
- WebSocket real-time updates
- Admin panel basics

## Default Accounts
| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@orbitrade.live | password | Admin |
| Master User | masteruser@orbitrade.live | password | User |

## API Endpoints
### Auth
- POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`

### User
- GET `/api/user/profile`, PATCH `/api/user/profile`
- POST `/api/user/kyc/upload`, GET `/api/user/kyc/status`
- GET `/api/user/pnl`, GET `/api/user/notifications`
- POST `/api/user/setup-account`, POST `/api/user/switch-account`

### Trading
- GET `/api/assets`, GET `/api/prices`
- POST `/api/trades`, GET `/api/trades`
- POST `/api/predict`, POST `/api/chat`

### Financial
- POST `/api/withdrawals`, GET `/api/withdrawals`

### Admin
- GET `/api/admin/stats`, GET/PUT `/api/admin/users`, GET/PUT `/api/admin/withdrawals`
- POST `/api/admin/broadcast`, GET/POST `/api/admin/promotions`
- POST `/api/admin/users/{id}/adjust-balance`, POST `/api/admin/users/{id}/kyc-action`

## Testing Status
- Backend: 100% (18/18 latest)
- Frontend: 100% (23/23 latest)
- 6 test iterations completed

## Mocked/Placeholder
- Crypto wallet addresses (sample addresses, no blockchain integration)
- Payment processing (deposits/withdrawals are tracked but not processed)
- Metal prices use fawazahmed0 API (may differ from TradingView)
- CoinGecko crypto API rate-limited with fallback caching

## Upcoming Tasks
- P1: Email Notifications (SendGrid)
- P1: Touch/No Touch option types
- P2: Real payment gateway integration
- P2: Backend refactoring (split server.py)
