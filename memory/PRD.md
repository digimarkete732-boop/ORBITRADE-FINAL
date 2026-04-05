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

## All Features Implemented

### Branding & PWA (Latest - April 2026)
- [x] ORBITRADE branding across entire project (renamed from ORBITAL)
- [x] Professional SVG logo with orbital ring + trading bars design
- [x] Favicon: SVG, ICO, PNG (16, 32, 48px)
- [x] PWA manifest with 192x192 and 512x512 icons (any + maskable)
- [x] Apple touch icon (180x180)
- [x] Open Graph meta tags for social media sharing
- [x] Twitter Card meta tags
- [x] OG image (1200x630) for link previews
- [x] Mobile asset selector dropdown (replaces list on mobile)

### UI/UX
- [x] Professional landing page with hero, features, testimonials, CTAs
- [x] Live price ticker marquee (scrolling)
- [x] Dark color scheme matching professional trading platforms
- [x] Scroll animations with Framer Motion
- [x] Full mobile responsiveness
- [x] Trade timer FIX - countdown works properly

### Trading System
- [x] Binary Options (BUY/SELL High/Low)
- [x] Touch/No Touch trading
- [x] 5-60 second expiry with WORKING countdown timer
- [x] Real-time price feeds (Forex, Crypto, Metals)
- [x] AI trading predictions (52%/48% confidence)
- [x] Platform win rate control (house edge)

### Payment System
- [x] Manual Crypto Deposit with blockchain animation
- [x] Deposit Bonus with wagering requirements
- [x] Withdrawal requests
- [x] Admin notifications for all requests

### Additional Features
- [x] Trading Tournaments with leaderboards
- [x] Affiliate System (3-tier commissions)
- [x] Win Rate Control for Admin
- [x] Legal Pages (ToS, Privacy, Risk)
- [x] Push Notifications

## Test Accounts
| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@orbitrade.live | password |
| User | masteruser@orbitrade.live | password |

## Pending / Future Tasks
- P0: Deploy the application
- P2: S3 storage for KYC documents
- P2: Real payment gateway integration for withdrawals
- P2: Automated tournament scheduling
- P2: Automated deposit detection via blockchain APIs
- P2: Refactor server.py (2700+ lines) into modular routes

## Date: 2026-04-05 (Branding & PWA Update Complete)
