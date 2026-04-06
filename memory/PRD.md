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
- **Animations**: Framer Motion for page transitions, scroll effects
- **Mobile**: Fully responsive with hamburger menu
- **Ambient BG**: PageBackground component with subtle gradient orbs on all pages

## All Features Implemented

### Branding & PWA (April 2026)
- [x] ORBITRADE branding across entire project
- [x] Professional SVG logo with orbital ring + trading bars
- [x] Favicon: SVG, ICO, PNG (16/32/48px)
- [x] PWA manifest with 192/512px icons (any + maskable)
- [x] Apple touch icon (180x180)
- [x] Open Graph + Twitter Card meta tags
- [x] OG image (1200x630) for social link previews
- [x] Mobile asset selector dropdown
- [x] PWA install prompt (professional, dismissible)
- [x] Consistent background across ALL pages (bg-app + ambient gradients)

### Admin Panel
- [x] Overview dashboard with stats
- [x] User management (search, edit, balance adjust, KYC)
- [x] Deposit management (approve/reject with screenshot viewer)
- [x] Withdrawal management (approve/reject)
- [x] Win Rate Control (platform house edge slider)
- [x] Tournament management (Create, Edit, Stop/Resume, Delete)
- [x] Commission structure settings (3-tier)
- [x] Payment settings (deposit/withdrawal fees, min/max, auto-approve, processing time)
- [x] Promotions (create deposit bonuses)
- [x] Broadcast notifications

### Trading System
- [x] Binary Options (BUY/SELL High/Low)
- [x] Touch/No Touch trading
- [x] 5-60 second expiry with countdown timer
- [x] Real-time price feeds (Forex, Crypto, Metals)
- [x] AI trading predictions
- [x] Platform win rate control

### Payment System
- [x] Manual Crypto Deposit with blockchain animation
- [x] Deposit Bonus with wagering requirements
- [x] Withdrawal requests
- [x] Admin notifications
- [x] Stripe payment integration

### Additional Features
- [x] Trading Tournaments with leaderboards
- [x] Affiliate System (3-tier commissions)
- [x] Legal Pages (ToS, Privacy, Risk)
- [x] Push Notifications
- [x] 2FA Authentication (TOTP)
- [x] KYC Document Upload
- [x] Password Reset Flow

## Test Accounts
| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@orbitrade.live | password |
| User | masteruser@orbitrade.live | password |

## User Personas
1. **Trader** - Main user who trades binary options
2. **Admin** - Platform administrator with full control
3. **Affiliate** - User who refers others for commission

## Core Requirements (Static)
- Real-time price feeds for forex, crypto, metals
- Binary options trading with multiple expiry times
- AI-powered trading predictions
- Complete admin panel for platform management
- Secure authentication with 2FA support

## What's Been Implemented (2026-04-06)
- Complete trading platform cloned and running
- All backend APIs functional (97% test success)
- Frontend working with real-time price feeds
- Admin panel fully accessible
- Authentication with slide-to-verify working
- Live price updates via WebSocket

## Pending / Future Tasks (Prioritized Backlog)

### P0 (Critical)
- [ ] Deploy the application to production
- [ ] Fix CoinGecko API rate limiting (add API key or alternative)

### P1 (High Priority)
- [ ] Refactor server.py (2938 lines) into modular routes
- [ ] Add proper error handling for price API failures

### P2 (Medium Priority)
- [ ] S3 storage for KYC documents
- [ ] Real payment gateway integration
- [ ] Automated tournament scheduling
- [ ] Automated deposit detection via blockchain APIs
- [ ] Copy Trading feature

### P3 (Nice to Have)
- [ ] Mobile app (React Native)
- [ ] Advanced charting indicators
- [ ] Social trading features
- [ ] Multi-language support

## Date: 2026-04-06 (Initial Analysis Complete)
