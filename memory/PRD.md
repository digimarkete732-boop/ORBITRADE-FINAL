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

### Additional Features
- [x] Trading Tournaments with leaderboards
- [x] Affiliate System (3-tier commissions)
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
- P2: Real payment gateway integration
- P2: Automated tournament scheduling
- P2: Automated deposit detection via blockchain APIs
- P2: Refactor server.py into modular routes

## Date: 2026-04-05 (Admin Features + BG + PWA Update)
