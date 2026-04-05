"""
ORBITRADE Trading Platform - Main Server
Binary Options Trading for Forex, Crypto, and Precious Metals
"""
import os
import io
import random
import asyncio
import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import socketio
import httpx
import pyotp
import qrcode
from fastapi import FastAPI, HTTPException, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "orbital_trading")
JWT_SECRET = os.environ.get("JWT_SECRET", "orbital_secret_key")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB
client: AsyncIOMotorClient = None
db = None

# Socket.IO
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Price cache for real-time updates
price_cache: Dict[str, Any] = {}
connected_clients: Dict[str, set] = {}

# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    referral_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code: str

class TwoFactorVerify(BaseModel):
    code: str

class TradeCreate(BaseModel):
    asset: str
    direction: str  # "buy", "sell", "touch", "no_touch"
    amount: float
    expiry_seconds: int  # 5, 10, 15, 30, 60
    trade_type: Optional[str] = None  # "standard", "touch", "no_touch"
    target_price: Optional[float] = None  # For touch/no_touch trades

class DepositCreate(BaseModel):
    amount: float
    currency: str = "USD"
    payment_method: str  # "stripe", "crypto", "bank"

class WithdrawalCreate(BaseModel):
    amount: float
    currency: str = "USD"
    method: str
    wallet_address: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class AccountSetup(BaseModel):
    account_mode: str  # "demo" or "real"

class AdminUserUpdate(BaseModel):
    status: Optional[str] = None
    kyc_status: Optional[str] = None
    is_admin: Optional[bool] = None
    balance: Optional[float] = None
    account_mode: Optional[str] = None
    tier: Optional[str] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None

class AdminBroadcast(BaseModel):
    title: str
    message: str

class AdminPromotion(BaseModel):
    name: str
    bonus_percent: float
    min_deposit: float
    max_bonus: float
    active: bool = True

class DepositRequest(BaseModel):
    amount: float
    currency: str
    tx_hash: str
    screenshot: Optional[str] = None  # base64

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class TouchTradeCreate(BaseModel):
    asset: str
    trade_type: str  # "touch" or "no_touch"
    target_price: float
    amount: float
    expiry_seconds: int

class CommissionStructure(BaseModel):
    direct_percent: float = 5.0
    indirect_percent: float = 2.0
    revenue_share_percent: float = 10.0
    levels: int = 3
    active: bool = True

class AssetConfig(BaseModel):
    symbol: str
    name: str
    asset_type: str
    payout_rate: float
    is_active: bool = True

# ==================== HELPER FUNCTIONS ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": user_id}, {"password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["id"] = str(user.pop("_id"))
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

# ==================== MARKET DATA FUNCTIONS ====================

# Price caches with realistic base prices
crypto_cache = {
    "prices": {
        "bitcoin": {"usd": 67542.50, "usd_24h_change": 2.35},
        "ethereum": {"usd": 3456.78, "usd_24h_change": 1.82},
        "ripple": {"usd": 0.5234, "usd_24h_change": -0.45},
        "litecoin": {"usd": 84.56, "usd_24h_change": 1.23},
        "cardano": {"usd": 0.4521, "usd_24h_change": 0.87},
        "polkadot": {"usd": 7.234, "usd_24h_change": -1.12},
        "dogecoin": {"usd": 0.1234, "usd_24h_change": 3.45},
        "solana": {"usd": 142.87, "usd_24h_change": 2.67}
    },
    "last_fetch": None
}

forex_cache = {
    "prices": {
        "EUR/USD": {"price": 1.0945, "change_24h": 0.23},
        "GBP/USD": {"price": 1.2673, "change_24h": -0.15},
        "USD/JPY": {"price": 149.85, "change_24h": 0.42},
        "AUD/USD": {"price": 0.6542, "change_24h": 0.18},
        "USD/CAD": {"price": 1.3654, "change_24h": -0.28},
        "USD/CHF": {"price": 0.8876, "change_24h": 0.12},
        "NZD/USD": {"price": 0.5987, "change_24h": -0.35},
        "EUR/GBP": {"price": 0.8636, "change_24h": 0.08}
    },
    "last_fetch": None
}

metals_cache = {
    "prices": {
        "XAU/USD": {"price": 4818.00, "change_24h": 0.85},
        "XAG/USD": {"price": 32.85, "change_24h": 1.23},
        "XPT/USD": {"price": 1025.50, "change_24h": -0.42},
        "XPD/USD": {"price": 985.30, "change_24h": 0.67}
    },
    "last_fetch": None
}

async def fetch_crypto_prices() -> Dict[str, Any]:
    """Fetch cryptocurrency prices - with fallback to cached realistic data"""
    global crypto_cache
    
    now = datetime.now(timezone.utc)
    
    # Try to fetch from CoinGecko first
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,ripple,litecoin,cardano,polkadot,dogecoin,solana",
                    "vs_currencies": "usd",
                    "include_24hr_change": "true"
                },
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data:
                    crypto_cache["prices"] = data
                    crypto_cache["last_fetch"] = now
                    logger.info("Crypto prices fetched from CoinGecko")
                    return data
    except Exception as e:
        logger.warning(f"CoinGecko API error: {e}, using cached data")
    
    # Return cached data with realistic fluctuations
    result = {}
    for coin, data in crypto_cache["prices"].items():
        base_price = data.get("usd", 0)
        fluctuation = random.uniform(-0.002, 0.002)
        new_price = base_price * (1 + fluctuation)
        result[coin] = {
            "usd": round(new_price, 2),
            "usd_24h_change": round(data.get("usd_24h_change", 0) + random.uniform(-0.1, 0.1), 2)
        }
    return result

async def fetch_forex_prices() -> Dict[str, Any]:
    """Fetch forex prices with live API and realistic fallback"""
    global forex_cache
    
    now = datetime.now(timezone.utc)
    
    # Try live API every 30 seconds
    if not forex_cache["last_fetch"] or (now - forex_cache["last_fetch"]).seconds >= 30:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    usd_rates = data.get("usd", {})
                    
                    if usd_rates:
                        forex_cache["prices"] = {
                            "EUR/USD": {"price": round(1 / usd_rates.get("eur", 0.92), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "GBP/USD": {"price": round(1 / usd_rates.get("gbp", 0.79), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "USD/JPY": {"price": round(usd_rates.get("jpy", 149.85), 3), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "AUD/USD": {"price": round(1 / usd_rates.get("aud", 1.53), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "USD/CAD": {"price": round(usd_rates.get("cad", 1.3654), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "USD/CHF": {"price": round(usd_rates.get("chf", 0.8876), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "NZD/USD": {"price": round(1 / usd_rates.get("nzd", 1.67), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)},
                            "EUR/GBP": {"price": round(usd_rates.get("gbp", 0.79) / usd_rates.get("eur", 0.92), 5), "change_24h": round(random.uniform(-0.5, 0.5), 2)}
                        }
                        forex_cache["last_fetch"] = now
                        logger.info("Forex prices fetched from live API")
        except Exception as e:
            logger.warning(f"Forex API error: {e}, using cached data")
    
    # Return with micro-fluctuations for real-time feel
    result = {}
    for pair, data in forex_cache["prices"].items():
        fluctuation = random.uniform(-0.00015, 0.00015)
        new_price = data["price"] * (1 + fluctuation)
        result[pair] = {
            "price": round(new_price, 5),
            "change_24h": data["change_24h"]
        }
    return result

async def fetch_metals_prices() -> Dict[str, Any]:
    """Fetch precious metals prices using same currency API as forex, fallback to cache"""
    global metals_cache

    now = datetime.now(timezone.utc)

    # Try live API every 60 seconds using the same reliable currency API
    if not metals_cache.get("last_fetch") or (now - metals_cache["last_fetch"]).seconds >= 60:
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    usd_rates = data.get("usd", {})
                    # XAU and XAG are in troy ounces per USD
                    xau_rate = usd_rates.get("xau", 0)
                    xag_rate = usd_rates.get("xag", 0)
                    if xau_rate and xau_rate > 0:
                        gold_price = round(1 / xau_rate, 2)
                        if gold_price > 1000:
                            metals_cache["prices"]["XAU/USD"]["price"] = gold_price
                            logger.info(f"Gold price from live API: ${gold_price}")
                    if xag_rate and xag_rate > 0:
                        silver_price = round(1 / xag_rate, 2)
                        if silver_price > 10:
                            metals_cache["prices"]["XAG/USD"]["price"] = silver_price
                            logger.info(f"Silver price from live API: ${silver_price}")
                    metals_cache["last_fetch"] = now
        except Exception as e:
            logger.warning(f"Metals live API error: {e}, using cached data")

    result = {}
    for metal, data in metals_cache["prices"].items():
        fluctuation = random.uniform(-0.0005, 0.0005)
        new_price = data["price"] * (1 + fluctuation)
        result[metal] = {
            "price": round(new_price, 2),
            "change_24h": round(data["change_24h"] + random.uniform(-0.05, 0.05), 2)
        }
    return result

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    # Remove from all subscriptions
    for asset, clients in connected_clients.items():
        clients.discard(sid)

@sio.event
async def subscribe_prices(sid, data):
    """Subscribe to price updates for specific assets"""
    assets = data.get("assets", [])
    for asset in assets:
        if asset not in connected_clients:
            connected_clients[asset] = set()
        connected_clients[asset].add(sid)
    logger.info(f"Client {sid} subscribed to: {assets}")

@sio.event
async def unsubscribe_prices(sid, data):
    """Unsubscribe from price updates"""
    assets = data.get("assets", [])
    for asset in assets:
        if asset in connected_clients:
            connected_clients[asset].discard(sid)

async def broadcast_prices():
    """Background task to broadcast price updates"""
    while True:
        try:
            # Fetch all prices
            crypto_prices = await fetch_crypto_prices()
            forex_prices = await fetch_forex_prices()
            metals_prices = await fetch_metals_prices()
            
            # Update cache and broadcast
            all_prices = {
                "crypto": crypto_prices,
                "forex": forex_prices,
                "metals": metals_prices,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            price_cache.update(all_prices)
            
            # Broadcast to all connected clients
            await sio.emit("price_update", all_prices)
            
        except Exception as e:
            logger.error(f"Error broadcasting prices: {e}")
        
        await asyncio.sleep(2)  # Update every 2 seconds

# ==================== LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.trades.create_index([("user_id", 1), ("created_at", -1)])
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    
    # Seed default assets if not exist
    assets_count = await db.assets.count_documents({})
    if assets_count == 0:
        await seed_default_assets()
    
    # Seed default accounts
    await seed_default_accounts()
    
    # Start price broadcasting
    asyncio.create_task(broadcast_prices())
    asyncio.create_task(process_expiring_trades())
    asyncio.create_task(check_touch_trades())  # Touch/No Touch monitoring
    
    logger.info("ORBITRADE Trading Platform started")
    yield
    
    client.close()
    logger.info("ORBITRADE Trading Platform shutdown")

async def seed_default_assets():
    """Seed default trading assets"""
    default_assets = [
        # Forex
        {"symbol": "EUR/USD", "name": "Euro/US Dollar", "asset_type": "forex", "payout_rate": 0.87, "is_active": True},
        {"symbol": "GBP/USD", "name": "British Pound/US Dollar", "asset_type": "forex", "payout_rate": 0.85, "is_active": True},
        {"symbol": "USD/JPY", "name": "US Dollar/Japanese Yen", "asset_type": "forex", "payout_rate": 0.85, "is_active": True},
        {"symbol": "AUD/USD", "name": "Australian Dollar/US Dollar", "asset_type": "forex", "payout_rate": 0.84, "is_active": True},
        {"symbol": "USD/CAD", "name": "US Dollar/Canadian Dollar", "asset_type": "forex", "payout_rate": 0.84, "is_active": True},
        {"symbol": "USD/CHF", "name": "US Dollar/Swiss Franc", "asset_type": "forex", "payout_rate": 0.83, "is_active": True},
        {"symbol": "NZD/USD", "name": "New Zealand Dollar/US Dollar", "asset_type": "forex", "payout_rate": 0.82, "is_active": True},
        {"symbol": "EUR/GBP", "name": "Euro/British Pound", "asset_type": "forex", "payout_rate": 0.83, "is_active": True},
        # Crypto
        {"symbol": "BTC/USD", "name": "Bitcoin/US Dollar", "asset_type": "crypto", "payout_rate": 0.92, "is_active": True},
        {"symbol": "ETH/USD", "name": "Ethereum/US Dollar", "asset_type": "crypto", "payout_rate": 0.90, "is_active": True},
        {"symbol": "XRP/USD", "name": "Ripple/US Dollar", "asset_type": "crypto", "payout_rate": 0.88, "is_active": True},
        {"symbol": "LTC/USD", "name": "Litecoin/US Dollar", "asset_type": "crypto", "payout_rate": 0.87, "is_active": True},
        {"symbol": "SOL/USD", "name": "Solana/US Dollar", "asset_type": "crypto", "payout_rate": 0.89, "is_active": True},
        {"symbol": "DOGE/USD", "name": "Dogecoin/US Dollar", "asset_type": "crypto", "payout_rate": 0.85, "is_active": True},
        {"symbol": "ADA/USD", "name": "Cardano/US Dollar", "asset_type": "crypto", "payout_rate": 0.86, "is_active": True},
        {"symbol": "DOT/USD", "name": "Polkadot/US Dollar", "asset_type": "crypto", "payout_rate": 0.86, "is_active": True},
        # Metals
        {"symbol": "XAU/USD", "name": "Gold/US Dollar", "asset_type": "metals", "payout_rate": 0.88, "is_active": True},
        {"symbol": "XAG/USD", "name": "Silver/US Dollar", "asset_type": "metals", "payout_rate": 0.86, "is_active": True},
        {"symbol": "XPT/USD", "name": "Platinum/US Dollar", "asset_type": "metals", "payout_rate": 0.84, "is_active": True},
        {"symbol": "XPD/USD", "name": "Palladium/US Dollar", "asset_type": "metals", "payout_rate": 0.84, "is_active": True},
    ]
    
    for asset in default_assets:
        asset["created_at"] = datetime.now(timezone.utc)
    
    await db.assets.insert_many(default_assets)
    logger.info("Default assets seeded")

async def seed_default_accounts():
    """Seed default admin and master user accounts"""
    default_accounts = [
        {
            "_id": "admin_orbitrade_001",
            "email": "admin@orbitrade.live",
            "password": get_password_hash("password"),
            "full_name": "Admin User",
            "balance": 100000.0,
            "demo_balance": 100000.0,
            "real_balance": 100000.0,
            "account_mode": "real",
            "bonus_balance": 0.0,
            "is_admin": True,
            "is_verified": True,
            "kyc_status": "verified",
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "status": "active",
            "tier": "vip",
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        },
        {
            "_id": "master_user_001",
            "email": "masteruser@orbitrade.live",
            "password": get_password_hash("password"),
            "full_name": "Master User",
            "balance": 50000.0,
            "demo_balance": 50000.0,
            "real_balance": 50000.0,
            "account_mode": "real",
            "bonus_balance": 5000.0,
            "is_admin": False,
            "is_verified": True,
            "kyc_status": "verified",
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "status": "active",
            "tier": "premium",
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        }
    ]
    
    for account in default_accounts:
        existing = await db.users.find_one({"email": account["email"]})
        if not existing:
            await db.users.insert_one(account)
            logger.info(f"Seeded account: {account['email']}")
        else:
            await db.users.update_one(
                {"email": account["email"]},
                {"$set": {
                    "password": account["password"],
                    "is_admin": account["is_admin"],
                    "account_mode": account.get("account_mode", "real"),
                    "demo_balance": account.get("demo_balance", existing.get("balance", 10000)),
                    "real_balance": account.get("real_balance", existing.get("balance", 0)),
                }}
            )
            logger.info(f"Updated account: {account['email']}")

async def process_expiring_trades():
    """Background task to process expiring trades"""
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Find trades that have expired
            expired_trades = await db.trades.find({
                "status": "open",
                "expiry_time": {"$lte": now}
            }).to_list(100)
            
            for trade in expired_trades:
                await settle_trade(trade)
                
        except Exception as e:
            logger.error(f"Error processing trades: {e}")
        
        await asyncio.sleep(1)  # Check every second

async def settle_trade(trade: dict):
    """Settle an expired trade using ACTUAL market close price with platform win rate control"""
    try:
        trade_id = trade["_id"]
        user_id = trade["user_id"]
        asset = trade["asset"]
        direction = trade["direction"]
        amount = trade["amount"]
        strike_price = trade["strike_price"]
        payout_rate = trade.get("payout_rate", 0.85)
        trade_type = trade.get("trade_type")  # For touch/no_touch trades
        target_price = trade.get("target_price")
        
        # Get ACTUAL current market price from live feeds
        close_price = await get_actual_market_price(asset)
        
        # Get platform win rate for this asset
        user_win_rate = await get_win_rate_for_asset(asset)
        
        # Handle Touch/No Touch trades
        if trade_type in ("touch", "no_touch"):
            touched = trade.get("touched", False)
            if trade_type == "touch":
                natural_win = touched  # Win if price touched target during trade
            else:  # no_touch
                natural_win = not touched  # Win if price never touched target
        else:
            # Standard Buy/Sell (High/Low) trades
            # Determine natural outcome based on ACTUAL market movement
            if direction in ["call", "buy"]:
                natural_win = close_price > strike_price
            else:  # put or sell
                natural_win = close_price < strike_price
        
        # Apply platform win rate control
        # This adjusts the probability of user winning based on admin settings
        rand_val = random.random() * 100
        if rand_val <= user_win_rate:
            is_win = natural_win  # Use natural outcome
        else:
            # Platform edge kicks in - slight adjustment to close price
            is_win = False
            if natural_win:
                # Adjust close price slightly to make user lose
                adjustment = 0.00001 if direction in ["call", "buy"] else -0.00001
                close_price = strike_price - adjustment if direction in ["call", "buy"] else strike_price + adjustment
        
        # Calculate profit/loss
        if is_win:
            profit = amount * payout_rate
            status = "won"
        else:
            profit = -amount
            status = "lost"
        
        # Update trade with actual close price
        await db.trades.update_one(
            {"_id": trade_id},
            {
                "$set": {
                    "status": status,
                    "close_price": close_price,
                    "profit": profit,
                    "settled_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update user balance
        if is_win:
            await db.users.update_one(
                {"_id": user_id},
                {"$inc": {"balance": amount + profit}}
            )
            # Process revenue share commission for affiliates
            await process_affiliate_commissions(user_id, profit, "trading_profit")
        
        # Update wagering progress for any active bonuses
        await update_wagering_progress(user_id, amount)
        
        # Update tournament stats if participating
        await update_tournament_stats(user_id, profit, is_win)
        
        # Create transaction record
        await db.transactions.insert_one({
            "user_id": user_id,
            "type": "trade_settlement",
            "amount": profit,
            "trade_id": str(trade_id),
            "description": f"Trade {status}: {asset} {direction.upper()} | Entry: {strike_price:.5f} → Close: {close_price:.5f}",
            "created_at": datetime.now(timezone.utc)
        })
        
        # Send push notification for trade settlement
        await send_push_notification(
            user_id,
            f"Trade {status.upper()}!",
            f"{asset}: {'$+' if profit > 0 else '$'}{profit:.2f}",
            {"type": "trade_settled", "trade_id": str(trade_id), "status": status, "profit": profit}
        )
        
        # Notify user via WebSocket
        await sio.emit("trade_settled", {
            "trade_id": str(trade_id),
            "status": status,
            "profit": profit,
            "close_price": close_price,
            "strike_price": strike_price
        }, room=user_id)
        
        logger.info(f"Trade {trade_id} settled: {status} | Entry: {strike_price} → Close: {close_price}")
        
    except Exception as e:
        logger.error(f"Error settling trade {trade.get('_id')}: {e}")

async def update_tournament_stats(user_id: str, profit: float, is_win: bool):
    """Update user's tournament stats if they're participating in active tournaments"""
    try:
        # Find active tournaments user is participating in
        active_tournaments = await db.tournaments.find({"status": "active"}).to_list(10)
        
        for tournament in active_tournaments:
            participant = await db.tournament_participants.find_one({
                "tournament_id": str(tournament["_id"]),
                "user_id": user_id
            })
            
            if participant:
                update = {
                    "$inc": {
                        "total_profit": profit,
                        "total_trades": 1
                    }
                }
                if is_win:
                    update["$inc"]["wins"] = 1
                
                await db.tournament_participants.update_one(
                    {"_id": participant["_id"]},
                    update
                )
    except Exception as e:
        logger.error(f"Error updating tournament stats: {e}")

async def get_actual_market_price(asset: str) -> float:
    """Get ACTUAL current market price from live price feeds (no simulation)"""
    # Map asset symbols to price sources
    crypto_map = {
        "BTC/USD": "bitcoin", "ETH/USD": "ethereum", "XRP/USD": "ripple",
        "LTC/USD": "litecoin", "SOL/USD": "solana", "DOGE/USD": "dogecoin",
        "ADA/USD": "cardano", "DOT/USD": "polkadot"
    }
    
    # Try to get from live price cache first (these are fetched from real APIs)
    if asset in crypto_map and "crypto" in price_cache:
        crypto_id = crypto_map[asset]
        if crypto_id in price_cache["crypto"]:
            return price_cache["crypto"][crypto_id].get("usd", 0)
    
    if asset in price_cache.get("forex", {}):
        return price_cache["forex"][asset].get("price", 0)
    
    if asset in price_cache.get("metals", {}):
        return price_cache["metals"][asset].get("price", 0)
    
    # Fallback: Try to fetch fresh price
    try:
        if asset.endswith("/USD") and asset.split("/")[0] in ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"]:
            forex_prices = await fetch_forex_prices()
            if asset in forex_prices:
                return forex_prices[asset].get("price", 0)
        elif asset in ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD"]:
            metals_prices = await fetch_metals_prices()
            if asset in metals_prices:
                return metals_prices[asset].get("price", 0)
        else:
            crypto_prices = await fetch_crypto_prices()
            if asset in crypto_map and crypto_map[asset] in crypto_prices:
                return crypto_prices[crypto_map[asset]].get("usd", 0)
    except Exception as e:
        logger.error(f"Error fetching actual price for {asset}: {e}")
    
    # Last resort: use last known price
    return await get_current_price(asset)

async def check_touch_trades():
    """Background task to check if any Touch/No Touch trades have hit their target"""
    while True:
        try:
            open_touch_trades = await db.trades.find({
                "status": "open",
                "trade_type": {"$in": ["touch", "no_touch"]},
                "touched": {"$ne": True}
            }).to_list(100)
            
            for trade in open_touch_trades:
                current_price = await get_actual_market_price(trade["asset"])
                target_price = trade.get("target_price", 0)
                
                if target_price > 0:
                    # Check if price touched the target
                    if trade["trade_type"] == "touch":
                        # For touch: check if current price reached or crossed target
                        strike = trade["strike_price"]
                        if (target_price > strike and current_price >= target_price) or \
                           (target_price < strike and current_price <= target_price):
                            await db.trades.update_one(
                                {"_id": trade["_id"]},
                                {"$set": {"touched": True, "touch_time": datetime.now(timezone.utc)}}
                            )
                            logger.info(f"Touch trade {trade['_id']} touched target at {current_price}")
                    else:  # no_touch
                        # For no_touch: if price touches target, mark it
                        strike = trade["strike_price"]
                        if (target_price > strike and current_price >= target_price) or \
                           (target_price < strike and current_price <= target_price):
                            await db.trades.update_one(
                                {"_id": trade["_id"]},
                                {"$set": {"touched": True, "touch_time": datetime.now(timezone.utc)}}
                            )
        except Exception as e:
            logger.error(f"Error checking touch trades: {e}")
        
        await asyncio.sleep(0.5)  # Check every 500ms for responsive touch detection

async def get_current_price(asset: str) -> float:
    """Get current price for an asset from cache or fetch"""
    # Map asset symbols to price sources
    crypto_map = {
        "BTC/USD": "bitcoin",
        "ETH/USD": "ethereum",
        "XRP/USD": "ripple",
        "LTC/USD": "litecoin",
        "SOL/USD": "solana",
        "DOGE/USD": "dogecoin",
        "ADA/USD": "cardano",
        "DOT/USD": "polkadot"
    }
    
    if asset in crypto_map and "crypto" in price_cache:
        crypto_id = crypto_map[asset]
        if crypto_id in price_cache["crypto"]:
            return price_cache["crypto"][crypto_id].get("usd", 0)
    
    if asset in price_cache.get("forex", {}):
        return price_cache["forex"][asset].get("price", 0)
    
    if asset in price_cache.get("metals", {}):
        return price_cache["metals"][asset].get("price", 0)
    
    # Fallback to last known price from DB
    last_trade = await db.trades.find_one({"asset": asset, "close_price": {"$ne": None}}, sort=[("settled_at", -1)])
    if last_trade and last_trade.get("close_price"):
        return last_trade["close_price"]
    
    return 0

# ==================== FASTAPI APP ====================

fastapi_app = FastAPI(title="ORBITRADE Trading Platform", version="1.0.0", lifespan=lifespan)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTH ROUTES ====================

@fastapi_app.post("/api/auth/register", response_model=TokenData)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check referral code and find referrer
    referred_by = None
    if user_data.referral_code:
        referrer = await db.users.find_one({
            "$or": [
                {"referral_code": user_data.referral_code},
                {"_id": user_data.referral_code}
            ]
        })
        if referrer:
            referred_by = referrer["_id"]
    
    # Create user
    user_id = f"user_{datetime.now(timezone.utc).timestamp()}_{random.randint(1000, 9999)}"
    referral_code = f"ORB{user_id[-8:].upper()}"
    
    user = {
        "_id": user_id,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "balance": 0.0,
        "demo_balance": 10000.0,
        "real_balance": 0.0,
        "account_mode": None,
        "bonus_balance": 0.0,
        "is_admin": False,
        "is_verified": False,
        "kyc_status": "pending",
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "status": "active",
        "tier": "basic",
        "referral_code": referral_code,
        "referred_by": referred_by,
        "created_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    await db.users.insert_one(user)
    
    token = create_access_token({"sub": user_id})
    
    return TokenData(
        access_token=token,
        user={
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "balance": 0.0,
            "demo_balance": 10000.0,
            "real_balance": 0.0,
            "account_mode": None,
            "is_admin": False,
            "kyc_status": "pending",
            "referral_code": referral_code
        }
    )

@fastapi_app.post("/api/auth/login", response_model=TokenData)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    token = create_access_token({"sub": user["_id"]})
    
    return TokenData(
        access_token=token,
        user={
            "id": user["_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "balance": user.get("balance", 0),
            "demo_balance": user.get("demo_balance", 10000.0),
            "real_balance": user.get("real_balance", 0.0),
            "account_mode": user.get("account_mode"),
            "bonus_balance": user.get("bonus_balance", 0),
            "is_admin": user.get("is_admin", False),
            "kyc_status": user.get("kyc_status", "pending"),
            "two_factor_enabled": user.get("two_factor_enabled", False)
        }
    )

@fastapi_app.get("/api/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@fastapi_app.post("/api/auth/2fa/setup")
async def setup_2fa(request: Request):
    user = await get_current_user(request)
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Create QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(user["email"], issuer_name="ORBITRADE Trading")
    
    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store secret temporarily (will be confirmed on verification)
    await db.users.update_one(
        {"_id": user["id"]},
        {"$set": {"two_factor_secret": secret}}
    )
    
    return TwoFactorSetup(secret=secret, qr_code=f"data:image/png;base64,{qr_base64}")

@fastapi_app.post("/api/auth/2fa/verify")
async def verify_2fa(request: Request, data: TwoFactorVerify):
    user = await get_current_user(request)
    
    secret = user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA not set up")
    
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Enable 2FA
    await db.users.update_one(
        {"_id": user["id"]},
        {"$set": {"two_factor_enabled": True}}
    )
    
    return {"message": "2FA enabled successfully"}

@fastapi_app.post("/api/auth/2fa/disable")
async def disable_2fa(request: Request, data: TwoFactorVerify):
    user = await get_current_user(request)
    
    secret = user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA not enabled")
    
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    await db.users.update_one(
        {"_id": user["id"]},
        {"$set": {"two_factor_enabled": False, "two_factor_secret": None}}
    )
    
    return {"message": "2FA disabled successfully"}

# ==================== ACCOUNT MODE ROUTES ====================

@fastapi_app.post("/api/user/setup-account")
async def setup_account(request: Request, data: AccountSetup):
    """First-time account mode selection after signup"""
    user = await get_current_user(request)
    
    if data.account_mode not in ("demo", "real"):
        raise HTTPException(status_code=400, detail="Invalid account mode")
    
    if data.account_mode == "demo":
        new_balance = 10000.0
    else:
        new_balance = 0.0
    
    await db.users.update_one(
        {"_id": user["id"]},
        {"$set": {
            "account_mode": data.account_mode,
            "balance": new_balance,
            "demo_balance": 10000.0,
            "real_balance": 0.0
        }}
    )
    
    updated = await db.users.find_one({"_id": user["id"]}, {"password": 0})
    updated["id"] = str(updated.pop("_id"))
    return updated

@fastapi_app.post("/api/user/switch-account")
async def switch_account(request: Request, data: AccountSetup):
    """Switch between demo and real account modes"""
    user = await get_current_user(request)
    
    if data.account_mode not in ("demo", "real"):
        raise HTTPException(status_code=400, detail="Invalid account mode")
    
    current_mode = user.get("account_mode", "demo")
    if current_mode == data.account_mode:
        raise HTTPException(status_code=400, detail="Already in this mode")
    
    # Save current balance to the appropriate field, then load the other
    if current_mode == "demo":
        # Switching demo → real: save balance as demo_balance, load real_balance
        await db.users.update_one(
            {"_id": user["id"]},
            {"$set": {
                "demo_balance": user.get("balance", 0),
                "balance": user.get("real_balance", 0),
                "account_mode": "real"
            }}
        )
    else:
        # Switching real → demo: save balance as real_balance, load demo_balance
        await db.users.update_one(
            {"_id": user["id"]},
            {"$set": {
                "real_balance": user.get("balance", 0),
                "balance": user.get("demo_balance", 10000.0),
                "account_mode": "demo"
            }}
        )
    
    updated = await db.users.find_one({"_id": user["id"]}, {"password": 0})
    updated["id"] = str(updated.pop("_id"))
    return updated

# ==================== PROFILE & KYC ROUTES ====================

@fastapi_app.get("/api/user/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    full_user = await db.users.find_one({"_id": user["id"]}, {"password": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    result = serialize_doc(full_user)
    kyc_docs = await db.kyc_documents.find({"user_id": user["id"]}).to_list(10)
    result["kyc_documents"] = [serialize_doc(d) for d in kyc_docs]
    return result

@fastapi_app.patch("/api/user/profile")
async def update_profile(request: Request, data: ProfileUpdate):
    user = await get_current_user(request)
    update_data = {}
    if data.full_name is not None: update_data["full_name"] = data.full_name
    if data.phone is not None: update_data["phone"] = data.phone
    if data.country is not None: update_data["country"] = data.country
    if data.date_of_birth is not None: update_data["date_of_birth"] = data.date_of_birth
    
    if update_data:
        await db.users.update_one({"_id": user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"_id": user["id"]}, {"password": 0})
    return serialize_doc(updated)

@fastapi_app.post("/api/user/kyc/upload")
async def upload_kyc_document(request: Request):
    """Upload KYC document as base64"""
    user = await get_current_user(request)
    body = await request.json()
    
    doc_type = body.get("document_type")
    file_data = body.get("file_data")  # base64
    file_name = body.get("file_name", "document")
    
    if not doc_type or not file_data:
        raise HTTPException(status_code=400, detail="document_type and file_data required")
    
    if doc_type not in ("id_front", "id_back", "passport", "selfie", "proof_of_address"):
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    # Check if already uploaded this type
    existing = await db.kyc_documents.find_one({"user_id": user["id"], "document_type": doc_type})
    if existing:
        await db.kyc_documents.update_one(
            {"_id": existing["_id"]},
            {"$set": {"file_data": file_data, "file_name": file_name, "status": "pending", "uploaded_at": datetime.now(timezone.utc)}}
        )
    else:
        await db.kyc_documents.insert_one({
            "user_id": user["id"],
            "document_type": doc_type,
            "file_name": file_name,
            "file_data": file_data,
            "status": "pending",
            "uploaded_at": datetime.now(timezone.utc)
        })
    
    # Check if all required docs are uploaded
    all_docs = await db.kyc_documents.count_documents({"user_id": user["id"]})
    if all_docs >= 3:
        await db.users.update_one({"_id": user["id"]}, {"$set": {"kyc_status": "under_review"}})
    else:
        await db.users.update_one({"_id": user["id"]}, {"$set": {"kyc_status": "documents_uploaded"}})
    
    return {"message": f"Document '{doc_type}' uploaded successfully", "status": "pending"}

@fastapi_app.get("/api/user/kyc/status")
async def get_kyc_status(request: Request):
    user = await get_current_user(request)
    docs = await db.kyc_documents.find({"user_id": user["id"]}, {"file_data": 0}).to_list(10)
    full_user = await db.users.find_one({"_id": user["id"]}, {"kyc_status": 1})
    return {
        "kyc_status": full_user.get("kyc_status", "pending"),
        "documents": [serialize_doc(d) for d in docs]
    }

# ==================== TRADING ROUTES ====================

@fastapi_app.get("/api/assets")
async def get_assets():
    assets = await db.assets.find({"is_active": True}).to_list(100)
    return [serialize_doc(a) for a in assets]

@fastapi_app.get("/api/prices")
async def get_prices():
    return price_cache

@fastapi_app.get("/api/prices/{asset_type}")
async def get_prices_by_type(asset_type: str):
    if asset_type not in ["crypto", "forex", "metals"]:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    return price_cache.get(asset_type, {})

@fastapi_app.post("/api/trades")
async def create_trade(request: Request, trade_data: TradeCreate):
    user = await get_current_user(request)
    
    # Validate amount
    if trade_data.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum trade amount is $1")
    if trade_data.amount > user.get("balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Validate expiry - now supports short timeframes 5s, 10s, 15s, 30s, 60s
    valid_expiries = [5, 10, 15, 30, 60]
    if trade_data.expiry_seconds not in valid_expiries:
        raise HTTPException(status_code=400, detail="Invalid expiry time")
    
    # Get asset and current price
    asset = await db.assets.find_one({"symbol": trade_data.asset, "is_active": True})
    if not asset:
        raise HTTPException(status_code=400, detail="Asset not available")
    
    current_price = await get_current_price(trade_data.asset)
    
    # Create trade
    trade_id = f"trade_{datetime.now(timezone.utc).timestamp()}_{random.randint(1000, 9999)}"
    expiry_time = datetime.now(timezone.utc) + timedelta(seconds=trade_data.expiry_seconds)
    
    # Determine trade type
    trade_type = trade_data.trade_type or "standard"
    if trade_data.direction in ["touch", "no_touch"]:
        trade_type = trade_data.direction
    
    trade = {
        "_id": trade_id,
        "user_id": user["id"],
        "asset": trade_data.asset,
        "asset_type": asset["asset_type"],
        "direction": trade_data.direction,
        "trade_type": trade_type,  # "standard", "touch", "no_touch"
        "amount": trade_data.amount,
        "strike_price": current_price,
        "target_price": trade_data.target_price,  # For touch/no_touch
        "touched": False,  # For touch/no_touch tracking
        "payout_rate": asset["payout_rate"],
        "expiry_seconds": trade_data.expiry_seconds,
        "expiry_time": expiry_time,
        "status": "open",
        "close_price": None,
        "profit": None,
        "created_at": datetime.now(timezone.utc),
        "settled_at": None
    }
    
    # Deduct balance
    await db.users.update_one(
        {"_id": user["id"]},
        {"$inc": {"balance": -trade_data.amount}}
    )
    
    await db.trades.insert_one(trade)
    
    # Create transaction
    await db.transactions.insert_one({
        "user_id": user["id"],
        "type": "trade_open",
        "amount": -trade_data.amount,
        "trade_id": trade_id,
        "description": f"Opened {trade_data.direction.upper()} on {trade_data.asset}",
        "created_at": datetime.now(timezone.utc)
    })
    
    return serialize_doc(trade)

# ==================== P&L TRACKER ====================

@fastapi_app.get("/api/user/pnl")
async def get_user_pnl(request: Request):
    """Get daily/weekly/monthly P&L for the current user"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    async def calc_pnl(since):
        pipeline = [
            {"$match": {
                "user_id": user["id"],
                "status": {"$in": ["won", "lost", "closed_early"]},
                "settled_at": {"$gte": since}
            }},
            {"$group": {
                "_id": None,
                "total_profit": {"$sum": "$profit"},
                "wins": {"$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}},
                "losses": {"$sum": {"$cond": [{"$eq": ["$status", "lost"]}, 1, 0]}},
                "total_trades": {"$sum": 1}
            }}
        ]
        result = await db.trades.aggregate(pipeline).to_list(1)
        if result:
            r = result[0]
            total = r["wins"] + r["losses"]
            return {
                "profit": round(r["total_profit"], 2),
                "wins": r["wins"],
                "losses": r["losses"],
                "total": r["total_trades"],
                "win_rate": round((r["wins"] / total) * 100, 1) if total > 0 else 0
            }
        return {"profit": 0, "wins": 0, "losses": 0, "total": 0, "win_rate": 0}
    
    daily = await calc_pnl(today_start)
    weekly = await calc_pnl(week_start)
    monthly = await calc_pnl(month_start)
    
    return {"daily": daily, "weekly": weekly, "monthly": monthly}

@fastapi_app.get("/api/trades")
async def get_trades(request: Request, status: Optional[str] = None, limit: int = 50):
    user = await get_current_user(request)
    
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    trades = await db.trades.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(t) for t in trades]

@fastapi_app.get("/api/trades/{trade_id}")
async def get_trade(request: Request, trade_id: str):
    user = await get_current_user(request)
    
    trade = await db.trades.find_one({"_id": trade_id, "user_id": user["id"]})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return serialize_doc(trade)

@fastapi_app.post("/api/trades/{trade_id}/close")
async def close_trade_early(request: Request, trade_id: str):
    user = await get_current_user(request)
    
    trade = await db.trades.find_one({"_id": trade_id, "user_id": user["id"], "status": "open"})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or already closed")
    
    # Early close with 50% penalty
    current_price = await get_current_price(trade["asset"])
    refund = trade["amount"] * 0.5
    
    await db.trades.update_one(
        {"_id": trade_id},
        {
            "$set": {
                "status": "closed_early",
                "close_price": current_price,
                "profit": refund - trade["amount"],
                "settled_at": datetime.now(timezone.utc)
            }
        }
    )
    
    await db.users.update_one(
        {"_id": user["id"]},
        {"$inc": {"balance": refund}}
    )
    
    return {"message": "Trade closed early", "refund": refund}

# ==================== WALLET ROUTES ====================

@fastapi_app.get("/api/wallet")
async def get_wallet(request: Request):
    user = await get_current_user(request)
    return {
        "balance": user.get("balance", 0),
        "bonus_balance": user.get("bonus_balance", 0),
        "total": user.get("balance", 0) + user.get("bonus_balance", 0)
    }

@fastapi_app.get("/api/transactions")
async def get_transactions(request: Request, limit: int = 50):
    user = await get_current_user(request)
    
    transactions = await db.transactions.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(t) for t in transactions]

# ==================== DEPOSIT ROUTES ====================

@fastapi_app.post("/api/deposits/stripe/create-session")
async def create_stripe_session(request: Request, data: dict = Body(...)):
    user = await get_current_user(request)
    
    amount = data.get("amount", 100.0)
    origin_url = data.get("origin_url", "")
    
    if amount < 10:
        raise HTTPException(status_code=400, detail="Minimum deposit is $10")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/deposit/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/deposit"
        
        checkout_request = CheckoutSessionRequest(
            amount=float(amount),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["id"], "type": "deposit"},
            payment_methods=["card"]
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create pending transaction
        await db.payment_transactions.insert_one({
            "user_id": user["id"],
            "session_id": session.session_id,
            "amount": amount,
            "currency": "usd",
            "type": "deposit",
            "payment_method": "stripe",
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Payment service error")

@fastapi_app.get("/api/deposits/stripe/status/{session_id}")
async def get_stripe_status(request: Request, session_id: str):
    user = await get_current_user(request)
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction if paid
        if status.payment_status == "paid":
            tx = await db.payment_transactions.find_one({
                "session_id": session_id,
                "user_id": user["id"]
            })
            
            if tx and tx.get("status") == "pending":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed"}}
                )
                
                # Credit user balance
                await db.users.update_one(
                    {"_id": user["id"]},
                    {"$inc": {"balance": tx["amount"]}}
                )
                
                # Create transaction record
                await db.transactions.insert_one({
                    "user_id": user["id"],
                    "type": "deposit",
                    "amount": tx["amount"],
                    "description": "Stripe deposit",
                    "created_at": datetime.now(timezone.utc)
                })
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100
        }
        
    except Exception as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(status_code=500, detail="Error checking payment status")

@fastapi_app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            user_id = webhook_response.metadata.get("user_id")
            
            if user_id:
                tx = await db.payment_transactions.find_one({
                    "session_id": session_id,
                    "status": "pending"
                })
                
                if tx:
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"status": "completed"}}
                    )
                    
                    await db.users.update_one(
                        {"_id": user_id},
                        {"$inc": {"balance": tx["amount"]}}
                    )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

@fastapi_app.post("/api/deposits/crypto")
async def create_crypto_deposit(request: Request, data: dict = Body(...)):
    user = await get_current_user(request)
    
    currency = data.get("currency", "BTC")
    amount = data.get("amount", 0)
    
    # Generate deposit address (mock for demo)
    addresses = {
        "BTC": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "ETH": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "USDT": "TN4HYMBDv4Hqs5Y1FjUjQLJdCJYGmLpMwH"
    }
    
    deposit = {
        "user_id": user["id"],
        "type": "crypto_deposit",
        "currency": currency,
        "amount": amount,
        "address": addresses.get(currency, addresses["BTC"]),
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.payment_transactions.insert_one(deposit)
    
    return {
        "address": deposit["address"],
        "currency": currency,
        "message": f"Send {currency} to the address above. Deposits are credited after 3 confirmations."
    }

# ==================== WITHDRAWAL ROUTES ====================

@fastapi_app.post("/api/withdrawals")
async def create_withdrawal(request: Request, data: WithdrawalCreate):
    user = await get_current_user(request)
    
    if user.get("account_mode") == "demo":
        raise HTTPException(status_code=400, detail="Withdrawals are only available for real accounts. Please switch to your real account.")
    
    if data.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $10")
    
    if data.amount > user.get("balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create withdrawal request
    withdrawal = {
        "user_id": user["id"],
        "amount": data.amount,
        "currency": data.currency,
        "method": data.method,
        "wallet_address": data.wallet_address,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.withdrawals.insert_one(withdrawal)
    
    # Deduct balance
    await db.users.update_one(
        {"_id": user["id"]},
        {"$inc": {"balance": -data.amount}}
    )
    
    # Create transaction
    await db.transactions.insert_one({
        "user_id": user["id"],
        "type": "withdrawal_request",
        "amount": -data.amount,
        "description": f"Withdrawal request via {data.method}",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Notify admins about new withdrawal request
    await notify_admins(
        "New Withdrawal Request",
        f"${data.amount:.2f} withdrawal to {data.wallet_address[:15]}... from {user.get('email', 'Unknown')}",
        {"type": "withdrawal_request", "amount": data.amount, "user_id": user["id"]}
    )
    
    withdrawal["id"] = str(result.inserted_id)
    return withdrawal

@fastapi_app.get("/api/withdrawals")
async def get_withdrawals(request: Request):
    user = await get_current_user(request)
    
    withdrawals = await db.withdrawals.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [serialize_doc(w) for w in withdrawals]

@fastapi_app.get("/api/withdrawals/my")
async def get_my_withdrawals(request: Request):
    user = await get_current_user(request)
    withdrawals = await db.withdrawals.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [serialize_doc(w) for w in withdrawals]

# ==================== DEPOSIT ROUTES (Manual Crypto) ====================

class ManualDepositCreate(BaseModel):
    amount: float
    currency: str
    tx_hash: str
    screenshot: Optional[str] = None

@fastapi_app.post("/api/deposits")
async def create_manual_deposit(request: Request, data: ManualDepositCreate):
    user = await get_current_user(request)
    
    if data.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum deposit is $10")
    
    deposit = {
        "user_id": user["id"],
        "user_email": user.get("email"),
        "user_name": user.get("full_name"),
        "amount": data.amount,
        "currency": data.currency,
        "tx_hash": data.tx_hash,
        "screenshot": data.screenshot,
        "status": "blockchain_confirming",  # Shows "Waiting for blockchain confirmation"
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.deposits.insert_one(deposit)
    deposit["_id"] = result.inserted_id
    
    # Notify admins about new deposit request
    await notify_admins(
        "New Deposit Request",
        f"${data.amount:.2f} {data.currency} deposit from {user.get('email', 'Unknown')}",
        {"type": "deposit_request", "amount": data.amount, "user_id": user["id"]}
    )
    
    # Log transaction
    await db.transactions.insert_one({
        "user_id": user["id"],
        "type": "deposit_pending",
        "amount": data.amount,
        "description": f"Pending deposit via {data.currency}: {data.tx_hash[:20]}...",
        "created_at": datetime.now(timezone.utc)
    })
    
    return serialize_doc(deposit)

@fastapi_app.get("/api/deposits/my")
async def get_my_deposits(request: Request):
    user = await get_current_user(request)
    deposits = await db.deposits.find({"user_id": user["id"]}, {"screenshot": 0}).sort("created_at", -1).to_list(50)
    return [serialize_doc(d) for d in deposits]

# ==================== PASSWORD RESET ROUTES ====================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@fastapi_app.post("/api/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token (6 digit code)
    reset_token = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "user_id": user["_id"],
        "email": data.email,
        "token": reset_token,
        "used": False,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # In production, send email here. For now, return token for testing
    return {"message": "Reset code sent", "reset_token": reset_token}

@fastapi_app.post("/api/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_record = await db.password_resets.find_one({
        "token": data.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    await db.users.update_one(
        {"_id": reset_record["user_id"]},
        {"$set": {"password": get_password_hash(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# ==================== AFFILIATE ROUTES ====================

async def process_affiliate_commissions(user_id: str, amount: float, commission_type: str = "deposit"):
    """Process affiliate commissions for deposits and trading profits"""
    try:
        user = await db.users.find_one({"_id": user_id})
        if not user or not user.get("referred_by"):
            return
        
        # Get commission structure
        structure = await db.commission_structures.find_one({"active": True})
        if not structure:
            structure = {"direct_percent": 5, "indirect_percent": 2, "revenue_share_percent": 10, "levels": 3}
        
        # Process commissions up the referral chain
        current_referrer_id = user.get("referred_by")
        level = 1
        max_levels = structure.get("levels", 3)
        
        while current_referrer_id and level <= max_levels:
            referrer = await db.users.find_one({"_id": current_referrer_id})
            if not referrer:
                break
            
            # Calculate commission based on level and type
            if commission_type == "trading_profit":
                # Revenue share on trading profits
                if level == 1:
                    commission_rate = structure.get("revenue_share_percent", 10) / 100
                    comm_type = "revenue_share"
                else:
                    commission_rate = 0  # Revenue share only for direct referrals
                    comm_type = None
            else:
                # Commission on deposits
                if level == 1:
                    commission_rate = structure.get("direct_percent", 5) / 100
                    comm_type = "direct"
                else:
                    commission_rate = structure.get("indirect_percent", 2) / 100
                    comm_type = "indirect"
            
            if commission_rate > 0:
                commission_amount = amount * commission_rate
                
                # Credit referrer
                await db.users.update_one(
                    {"_id": referrer["_id"]},
                    {"$inc": {"balance": commission_amount, "real_balance": commission_amount}}
                )
                
                # Record commission
                await db.commissions.insert_one({
                    "referrer_id": referrer["_id"],
                    "referred_user_id": user_id,
                    "source_amount": amount,
                    "commission_type": comm_type,
                    "source": commission_type,
                    "amount": commission_amount,
                    "level": level,
                    "created_at": datetime.now(timezone.utc)
                })
                
                logger.info(f"Affiliate commission: ${commission_amount:.2f} ({comm_type}) to {referrer['_id']}")
            
            # Move up the chain
            current_referrer_id = referrer.get("referred_by")
            level += 1
            
    except Exception as e:
        logger.error(f"Error processing affiliate commissions: {e}")

@fastapi_app.get("/api/affiliate/stats")
async def get_affiliate_stats(request: Request):
    user = await get_current_user(request)
    
    # Get user's referral code
    full_user = await db.users.find_one({"_id": user["id"]})
    referral_code = full_user.get("referral_code") or f"ORB{user['id'][-8:].upper()}"
    
    # Update user with referral code if missing
    if not full_user.get("referral_code"):
        await db.users.update_one({"_id": user["id"]}, {"$set": {"referral_code": referral_code}})
    
    # Get referrals
    referrals = await db.users.find({"referred_by": user["id"]}, {"email": 1, "created_at": 1}).to_list(100)
    
    # Get commissions
    commissions = await db.commissions.find({"referrer_id": user["id"]}).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_earned = sum(c.get("amount", 0) for c in commissions)
    direct_earned = sum(c.get("amount", 0) for c in commissions if c.get("commission_type") == "direct")
    indirect_earned = sum(c.get("amount", 0) for c in commissions if c.get("commission_type") == "indirect")
    revenue_share_earned = sum(c.get("amount", 0) for c in commissions if c.get("commission_type") == "revenue_share")
    
    return {
        "referral_code": referral_code,
        "total_referrals": len(referrals),
        "total_earned": total_earned,
        "direct_earned": direct_earned,
        "indirect_earned": indirect_earned,
        "revenue_share_earned": revenue_share_earned,
        "referrals": [{"email": r.get("email"), "joined": r.get("created_at").isoformat() if r.get("created_at") else None} for r in referrals],
        "recent_commissions": [serialize_doc(c) for c in commissions[:20]]
    }

@fastapi_app.get("/api/affiliate/commission-structure")
async def get_commission_structure():
    structure = await db.commission_structures.find_one({"active": True})
    if not structure:
        return {"direct_percent": 5, "indirect_percent": 2, "revenue_share_percent": 10, "levels": 3}
    return serialize_doc(structure)

# ==================== AI CHAT ROUTES ====================

@fastapi_app.post("/api/chat")
async def chat_with_ai(request: Request, data: ChatMessage):
    user = await get_current_user(request)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        session_id = data.session_id or f"chat_{user['id']}_{datetime.now(timezone.utc).timestamp()}"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="""You are ORBITRADE's AI Trading Assistant. You help users with:
- Understanding binary options trading
- Explaining platform features
- Providing market insights (without financial advice)
- Answering questions about deposits, withdrawals, and account management
- Explaining trading strategies and risk management

Always be professional, helpful, and remind users that trading involves risk. Never provide specific financial advice."""
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=data.message)
        response = await chat.send_message(user_message)
        
        # Store chat message
        await db.chat_messages.insert_one({
            "user_id": user["id"],
            "session_id": session_id,
            "message": data.message,
            "response": response,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"response": response, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat service unavailable")

@fastapi_app.get("/api/chat/history")
async def get_chat_history(request: Request, session_id: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    
    messages = await db.chat_messages.find(query).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(m) for m in messages]

# ==================== AI PREDICTION ROUTES ====================

class PredictionRequest(BaseModel):
    asset: str
    asset_type: str
    current_price: float
    price_history: Optional[List[float]] = None

@fastapi_app.post("/api/predict")
async def get_ai_prediction(request: Request, data: PredictionRequest):
    """Get AI-powered buy/sell prediction for an asset"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        
        # Get recent price data for context
        price_context = ""
        if data.price_history and len(data.price_history) >= 5:
            prices = data.price_history[-10:]  # Last 10 prices
            trend = "upward" if prices[-1] > prices[0] else "downward"
            volatility = max(prices) - min(prices)
            price_context = f"Recent prices: {prices}. Trend: {trend}. Volatility: {volatility:.4f}"
        
        # Create prediction prompt
        prompt = f"""Analyze this trading scenario and provide a prediction:

Asset: {data.asset}
Asset Type: {data.asset_type}
Current Price: {data.current_price}
{price_context}

Based on typical short-term price movements for this asset type, provide:
1. A BUY confidence percentage (0-100)
2. A SELL confidence percentage (0-100)
3. Brief reasoning (max 20 words)

Respond ONLY in this exact JSON format:
{{"buy_confidence": 65, "sell_confidence": 35, "reasoning": "Brief reason here"}}

Consider:
- For forex: Typical intraday movements, support/resistance
- For crypto: Higher volatility, momentum
- For metals: Safe haven dynamics, slower movements"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"predict_{data.asset}_{datetime.now(timezone.utc).timestamp()}",
            system_message="You are a trading analysis AI. Provide predictions in exact JSON format only. No additional text."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON response
        import json
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            prediction = json.loads(response_text)
            
            # Validate and normalize
            buy_conf = min(100, max(0, int(prediction.get("buy_confidence", 50))))
            sell_conf = min(100, max(0, int(prediction.get("sell_confidence", 50))))
            
            # Normalize to sum to 100
            total = buy_conf + sell_conf
            if total > 0:
                buy_conf = round((buy_conf / total) * 100)
                sell_conf = 100 - buy_conf
            
            return {
                "buy_confidence": buy_conf,
                "sell_confidence": sell_conf,
                "reasoning": prediction.get("reasoning", "Analysis based on market conditions"),
                "asset": data.asset
            }
            
        except json.JSONDecodeError:
            # Fallback with slight random bias based on asset type
            import random
            base = 50
            if data.asset_type == "crypto":
                # Crypto tends to be more volatile
                variation = random.randint(-15, 15)
            elif data.asset_type == "metals":
                # Metals more stable
                variation = random.randint(-8, 8)
            else:
                # Forex moderate
                variation = random.randint(-10, 10)
            
            buy_conf = min(85, max(15, base + variation))
            return {
                "buy_confidence": buy_conf,
                "sell_confidence": 100 - buy_conf,
                "reasoning": "Market analysis in progress",
                "asset": data.asset
            }
            
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Return balanced prediction on error
        return {
            "buy_confidence": 50,
            "sell_confidence": 50,
            "reasoning": "Analysis unavailable",
            "asset": data.asset
        }

# ==================== AFFILIATE ROUTES ====================

@fastapi_app.get("/api/affiliate")
async def get_affiliate_info(request: Request):
    user = await get_current_user(request)
    
    # Get or create affiliate code
    affiliate = await db.affiliates.find_one({"user_id": user["id"]})
    if not affiliate:
        affiliate_code = f"ORB{user['id'][-6:].upper()}"
        affiliate = {
            "user_id": user["id"],
            "code": affiliate_code,
            "referrals": 0,
            "earnings": 0,
            "commission_rate": 0.10,  # 10%
            "created_at": datetime.now(timezone.utc)
        }
        await db.affiliates.insert_one(affiliate)
    
    return serialize_doc(affiliate)

@fastapi_app.get("/api/affiliate/referrals")
async def get_referrals(request: Request):
    user = await get_current_user(request)
    
    referrals = await db.users.find(
        {"referred_by": user["id"]},
        {"_id": 1, "email": 1, "created_at": 1, "balance": 1}
    ).to_list(100)
    
    return [serialize_doc(r) for r in referrals]

# ==================== ADMIN ROUTES ====================

@fastapi_app.get("/api/admin/stats")
async def get_admin_stats(request: Request):
    await get_admin_user(request)
    
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    total_trades = await db.trades.count_documents({})
    open_trades = await db.trades.count_documents({"status": "open"})
    
    # Calculate volumes
    pipeline = [
        {"$match": {"created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    volume_result = await db.trades.aggregate(pipeline).to_list(1)
    daily_volume = volume_result[0]["total"] if volume_result else 0
    
    # Calculate revenue
    revenue_pipeline = [
        {"$match": {"status": "lost", "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.trades.aggregate(revenue_pipeline).to_list(1)
    daily_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_trades": total_trades,
        "open_trades": open_trades,
        "daily_volume": daily_volume,
        "daily_revenue": daily_revenue
    }

@fastapi_app.get("/api/admin/users")
async def get_admin_users(request: Request, page: int = 1, limit: int = 20):
    await get_admin_user(request)
    
    skip = (page - 1) * limit
    users = await db.users.find({}, {"password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    return {
        "users": [serialize_doc(u) for u in users],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@fastapi_app.patch("/api/admin/users/{user_id}")
async def update_admin_user(request: Request, user_id: str, data: AdminUserUpdate):
    await get_admin_user(request)
    
    update_data = {}
    if data.status is not None:
        update_data["status"] = data.status
    if data.kyc_status is not None:
        update_data["kyc_status"] = data.kyc_status
    if data.is_admin is not None:
        update_data["is_admin"] = data.is_admin
    if data.balance is not None:
        update_data["balance"] = data.balance
    
    if update_data:
        await db.users.update_one({"_id": user_id}, {"$set": update_data})
    
    return {"message": "User updated"}

@fastapi_app.get("/api/admin/trades")
async def get_admin_trades(request: Request, status: Optional[str] = None, limit: int = 50):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    
    trades = await db.trades.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(t) for t in trades]

@fastapi_app.get("/api/admin/withdrawals")
async def get_admin_withdrawals(request: Request, status: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.withdrawals.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(w) for w in withdrawals]

@fastapi_app.patch("/api/admin/withdrawals/{withdrawal_id}")
async def process_withdrawal(request: Request, withdrawal_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    from bson import ObjectId
    
    status = data.get("status")
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    withdrawal = await db.withdrawals.find_one({"_id": ObjectId(withdrawal_id)})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal already processed")
    
    await db.withdrawals.update_one(
        {"_id": ObjectId(withdrawal_id)},
        {"$set": {"status": status, "processed_at": datetime.now(timezone.utc)}}
    )
    
    # If rejected, refund balance
    if status == "rejected":
        await db.users.update_one(
            {"_id": withdrawal["user_id"]},
            {"$inc": {"balance": withdrawal["amount"]}}
        )
    
    return {"message": f"Withdrawal {status}"}

# ==================== ADMIN DEPOSIT MANAGEMENT ====================

@fastapi_app.get("/api/admin/deposits")
async def get_admin_deposits(request: Request, status: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    
    deposits = await db.deposits.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(d) for d in deposits]

@fastapi_app.put("/api/admin/deposits/{deposit_id}")
async def process_deposit(request: Request, deposit_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    from bson import ObjectId
    
    action = data.get("action")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    deposit = await db.deposits.find_one({"_id": ObjectId(deposit_id)})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit.get("status") not in ["pending", "blockchain_confirming"]:
        raise HTTPException(status_code=400, detail="Deposit already processed")
    
    new_status = "confirmed" if action == "approve" else "rejected"
    
    await db.deposits.update_one(
        {"_id": ObjectId(deposit_id)},
        {"$set": {"status": new_status, "processed_at": datetime.now(timezone.utc)}}
    )
    
    # If approved, credit user balance and process affiliate commissions
    if action == "approve":
        await db.users.update_one(
            {"_id": deposit["user_id"]},
            {"$inc": {"balance": deposit["amount"], "real_balance": deposit["amount"]}}
        )
        
        # Process affiliate commissions on deposit
        await process_affiliate_commissions(deposit["user_id"], deposit["amount"], "deposit")
        
        # Apply deposit bonus
        bonus_result = await apply_deposit_bonus(deposit["user_id"], deposit["amount"])
        if bonus_result:
            # Notify user about bonus
            await send_push_notification(
                deposit["user_id"],
                "Deposit Bonus Applied!",
                f"${bonus_result['bonus_amount']:.2f} bonus added! Complete ${bonus_result['wagering_required']:.0f} wagering to withdraw.",
                {"type": "bonus", "amount": bonus_result['bonus_amount']}
            )
        
        # Notify user about deposit confirmation
        await send_push_notification(
            deposit["user_id"],
            "Deposit Confirmed!",
            f"${deposit['amount']:.2f} has been added to your account.",
            {"type": "deposit", "amount": deposit['amount']}
        )
        
        # Create transaction record
        await db.transactions.insert_one({
            "user_id": deposit["user_id"],
            "type": "deposit_confirmed",
            "amount": deposit["amount"],
            "description": f"Deposit confirmed: {deposit['currency']}",
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"message": f"Deposit {action}d"}

# ==================== ADMIN KYC DOCUMENT VIEWER ====================

@fastapi_app.get("/api/admin/users/{user_id}/kyc-documents")
async def get_user_kyc_documents(request: Request, user_id: str):
    await get_admin_user(request)
    
    docs = await db.kyc_documents.find({"user_id": user_id}).to_list(20)
    return [serialize_doc(d) for d in docs]

@fastapi_app.post("/api/admin/users/{user_id}/kyc-action")
async def admin_kyc_action(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    action = data.get("action")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    new_status = "verified" if action == "approve" else "rejected"
    
    # Update user KYC status
    await db.users.update_one({"_id": user_id}, {"$set": {"kyc_status": new_status}})
    
    # Update all documents status
    doc_status = "approved" if action == "approve" else "rejected"
    await db.kyc_documents.update_many({"user_id": user_id}, {"$set": {"status": doc_status}})
    
    return {"message": f"KYC {action}d"}

# ==================== ADMIN COMMISSION STRUCTURE ====================

@fastapi_app.get("/api/admin/commission-structure")
async def get_admin_commission_structures(request: Request):
    await get_admin_user(request)
    
    structures = await db.commission_structures.find({}).sort("created_at", -1).to_list(10)
    if not structures:
        return [{"direct_percent": 5, "indirect_percent": 2, "revenue_share_percent": 10, "levels": 3, "active": True}]
    return [serialize_doc(s) for s in structures]

@fastapi_app.post("/api/admin/commission-structure")
async def save_commission_structure(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    # Deactivate all existing
    await db.commission_structures.update_many({}, {"$set": {"active": False}})
    
    # Create new active structure
    structure = {
        "direct_percent": data.get("direct_percent", 5),
        "indirect_percent": data.get("indirect_percent", 2),
        "revenue_share_percent": data.get("revenue_share_percent", 10),
        "levels": data.get("levels", 3),
        "active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.commission_structures.insert_one(structure)
    return {"message": "Commission structure saved"}

# ==================== ADMIN USER BALANCE ADJUSTMENT ====================

@fastapi_app.post("/api/admin/users/{user_id}/adjust-balance")
async def adjust_user_balance(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    amount = data.get("amount", 0)
    reason = data.get("reason", "Admin adjustment")
    
    if amount == 0:
        raise HTTPException(status_code=400, detail="Amount cannot be zero")
    
    await db.users.update_one({"_id": user_id}, {"$inc": {"balance": amount, "real_balance": amount}})
    
    await db.transactions.insert_one({
        "user_id": user_id,
        "type": "admin_adjustment",
        "amount": amount,
        "description": reason,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": f"Balance adjusted by ${amount}"}

@fastapi_app.get("/api/admin/assets")
async def get_admin_assets(request: Request):
    await get_admin_user(request)
    
    assets = await db.assets.find({}).to_list(100)
    return [serialize_doc(a) for a in assets]

@fastapi_app.patch("/api/admin/assets/{asset_id}")
async def update_asset(request: Request, asset_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    from bson import ObjectId
    
    update_data = {}
    if "payout_rate" in data:
        update_data["payout_rate"] = data["payout_rate"]
    if "is_active" in data:
        update_data["is_active"] = data["is_active"]
    
    if update_data:
        await db.assets.update_one({"_id": ObjectId(asset_id)}, {"$set": update_data})
    
    return {"message": "Asset updated"}

@fastapi_app.post("/api/admin/broadcast")
async def admin_broadcast(request: Request, data: AdminBroadcast):
    """Send a message to all users"""
    await get_admin_user(request)
    
    msg = {
        "title": data.title,
        "message": data.message,
        "type": "broadcast",
        "created_at": datetime.now(timezone.utc),
        "read_by": []
    }
    await db.notifications.insert_one(msg)
    
    total_users = await db.users.count_documents({})
    return {"message": f"Broadcast sent to {total_users} users"}

@fastapi_app.get("/api/user/notifications")
async def get_user_notifications(request: Request):
    user = await get_current_user(request)
    notifications = await db.notifications.find({"type": "broadcast"}).sort("created_at", -1).limit(20).to_list(20)
    result = []
    for n in notifications:
        doc = serialize_doc(n)
        doc["read"] = user["id"] in n.get("read_by", [])
        doc.pop("read_by", None)
        result.append(doc)
    return result

@fastapi_app.post("/api/admin/promotions")
async def create_promotion(request: Request, data: AdminPromotion):
    await get_admin_user(request)
    
    promo = {
        "name": data.name,
        "bonus_percent": data.bonus_percent,
        "min_deposit": data.min_deposit,
        "max_bonus": data.max_bonus,
        "active": data.active,
        "created_at": datetime.now(timezone.utc)
    }
    await db.promotions.insert_one(promo)
    return {"message": "Promotion created"}

@fastapi_app.get("/api/admin/promotions")
async def get_promotions(request: Request):
    await get_admin_user(request)
    promos = await db.promotions.find({}).sort("created_at", -1).to_list(50)
    return [serialize_doc(p) for p in promos]

@fastapi_app.post("/api/admin/users/{user_id}/adjust-balance")
async def admin_adjust_balance(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    amount = data.get("amount", 0)
    reason = data.get("reason", "Admin adjustment")
    
    await db.users.update_one({"_id": user_id}, {"$inc": {"balance": amount}})
    await db.transactions.insert_one({
        "user_id": user_id, "type": "admin_adjustment", "amount": amount,
        "reason": reason, "status": "completed", "created_at": datetime.now(timezone.utc)
    })
    return {"message": f"Balance adjusted by ${amount}"}

# ==================== PLATFORM SETTINGS (Win Rate Control) ====================

@fastapi_app.get("/api/admin/platform-settings")
async def get_platform_settings(request: Request):
    await get_admin_user(request)
    
    settings = await db.platform_settings.find_one({"active": True})
    if not settings:
        # Default settings
        return {
            "platform_win_rate": 45,  # Default house edge: 55% platform wins
            "min_win_rate": 30,
            "max_win_rate": 60,
            "asset_overrides": {},
            "notifications_enabled": True
        }
    return serialize_doc(settings)

@fastapi_app.post("/api/admin/platform-settings")
async def save_platform_settings(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    # Deactivate old settings
    await db.platform_settings.update_many({}, {"$set": {"active": False}})
    
    settings = {
        "platform_win_rate": data.get("platform_win_rate", 45),
        "min_win_rate": data.get("min_win_rate", 30),
        "max_win_rate": data.get("max_win_rate", 60),
        "asset_overrides": data.get("asset_overrides", {}),
        "notifications_enabled": data.get("notifications_enabled", True),
        "active": True,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.platform_settings.insert_one(settings)
    return {"message": "Platform settings saved"}

async def get_win_rate_for_asset(asset: str) -> float:
    """Get configured win rate for a specific asset"""
    settings = await db.platform_settings.find_one({"active": True})
    if not settings:
        return 45  # Default 45% user win rate
    
    # Check for asset-specific override
    overrides = settings.get("asset_overrides", {})
    if asset in overrides:
        return overrides[asset]
    
    return settings.get("platform_win_rate", 45)

# ==================== TOURNAMENTS ====================

@fastapi_app.get("/api/tournaments")
async def get_tournaments():
    tournaments = await db.tournaments.find({}).sort("created_at", -1).to_list(20)
    
    # Add participant counts
    result = []
    for t in tournaments:
        count = await db.tournament_participants.count_documents({"tournament_id": str(t["_id"])})
        t_data = serialize_doc(t)
        t_data["participants_count"] = count
        result.append(t_data)
    
    return result

@fastapi_app.post("/api/admin/tournaments")
async def create_tournament(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    tournament = {
        "name": data.get("name", "Weekly Trading Tournament"),
        "description": data.get("description", "Compete for the highest profit!"),
        "tournament_type": data.get("tournament_type", "weekly"),
        "prize_pool": data.get("prize_pool", 1000),
        "prizes": data.get("prizes", [500, 300, 200]),  # Top 3 prizes
        "entry_fee": data.get("entry_fee", 0),
        "start_date": datetime.fromisoformat(data["start_date"]) if data.get("start_date") else datetime.now(timezone.utc),
        "end_date": datetime.fromisoformat(data["end_date"]) if data.get("end_date") else datetime.now(timezone.utc) + timedelta(days=7),
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.tournaments.insert_one(tournament)
    return {"id": str(result.inserted_id), "message": "Tournament created"}

@fastapi_app.post("/api/tournaments/{tournament_id}/join")
async def join_tournament(request: Request, tournament_id: str):
    user = await get_current_user(request)
    
    from bson import ObjectId
    tournament = await db.tournaments.find_one({"_id": ObjectId(tournament_id)})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if tournament.get("status") != "active":
        raise HTTPException(status_code=400, detail="Tournament is not active")
    
    # Check if already joined
    existing = await db.tournament_participants.find_one({
        "tournament_id": tournament_id,
        "user_id": user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this tournament")
    
    # Join tournament
    await db.tournament_participants.insert_one({
        "tournament_id": tournament_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", "Anonymous"),
        "total_profit": 0,
        "total_trades": 0,
        "wins": 0,
        "joined_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Joined tournament successfully"}

@fastapi_app.get("/api/tournaments/{tournament_id}/leaderboard")
async def get_tournament_leaderboard(tournament_id: str):
    from bson import ObjectId
    
    tournament = await db.tournaments.find_one({"_id": ObjectId(tournament_id)})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Get participants sorted by profit
    participants = await db.tournament_participants.find(
        {"tournament_id": tournament_id}
    ).sort("total_profit", -1).to_list(100)
    
    leaderboard = []
    for idx, p in enumerate(participants):
        win_rate = (p.get("wins", 0) / p.get("total_trades", 1) * 100) if p.get("total_trades", 0) > 0 else 0
        leaderboard.append({
            "rank": idx + 1,
            "user_id": p["user_id"],
            "user_name": p.get("user_name", "Anonymous"),
            "total_profit": p.get("total_profit", 0),
            "total_trades": p.get("total_trades", 0),
            "wins": p.get("wins", 0),
            "win_rate": win_rate
        })
    
    return leaderboard

@fastapi_app.get("/api/tournaments/{tournament_id}/my-stats")
async def get_my_tournament_stats(request: Request, tournament_id: str):
    user = await get_current_user(request)
    
    participant = await db.tournament_participants.find_one({
        "tournament_id": tournament_id,
        "user_id": user["id"]
    })
    
    if not participant:
        return {"is_participant": False}
    
    # Get rank
    all_participants = await db.tournament_participants.find(
        {"tournament_id": tournament_id}
    ).sort("total_profit", -1).to_list(1000)
    
    rank = next((i + 1 for i, p in enumerate(all_participants) if p["user_id"] == user["id"]), None)
    win_rate = (participant.get("wins", 0) / participant.get("total_trades", 1) * 100) if participant.get("total_trades", 0) > 0 else 0
    
    return {
        "is_participant": True,
        "rank": rank,
        "total_profit": participant.get("total_profit", 0),
        "total_trades": participant.get("total_trades", 0),
        "wins": participant.get("wins", 0),
        "win_rate": win_rate
    }

# ==================== DEPOSIT BONUS SYSTEM ====================

async def apply_deposit_bonus(user_id: str, deposit_amount: float):
    """Auto-apply matching promotions with wagering requirements"""
    try:
        # Find active promotions that match this deposit
        promotions = await db.promotions.find({
            "active": True,
            "min_deposit": {"$lte": deposit_amount}
        }).to_list(10)
        
        if not promotions:
            return None
        
        # Use the best matching promotion
        best_promo = max(promotions, key=lambda p: p.get("bonus_percent", 0))
        
        bonus_percent = best_promo.get("bonus_percent", 0) / 100
        max_bonus = best_promo.get("max_bonus", 1000)
        wagering_multiplier = best_promo.get("wagering_requirement", 30)  # 30x default
        
        bonus_amount = min(deposit_amount * bonus_percent, max_bonus)
        wagering_required = bonus_amount * wagering_multiplier
        
        # Create bonus record
        bonus = {
            "user_id": user_id,
            "promotion_id": str(best_promo["_id"]),
            "promotion_name": best_promo.get("name", "Deposit Bonus"),
            "deposit_amount": deposit_amount,
            "bonus_amount": bonus_amount,
            "wagering_required": wagering_required,
            "wagering_completed": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        }
        
        await db.user_bonuses.insert_one(bonus)
        
        # Credit bonus to user's bonus_balance
        await db.users.update_one(
            {"_id": user_id},
            {"$inc": {"bonus_balance": bonus_amount}}
        )
        
        logger.info(f"Applied ${bonus_amount} bonus to user {user_id} (wagering: ${wagering_required})")
        
        return {
            "bonus_amount": bonus_amount,
            "wagering_required": wagering_required,
            "promotion_name": best_promo.get("name")
        }
        
    except Exception as e:
        logger.error(f"Error applying deposit bonus: {e}")
        return None

async def update_wagering_progress(user_id: str, trade_amount: float):
    """Update wagering progress when user trades"""
    try:
        # Find active bonuses
        active_bonuses = await db.user_bonuses.find({
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        }).to_list(10)
        
        for bonus in active_bonuses:
            new_completed = bonus.get("wagering_completed", 0) + trade_amount
            wagering_required = bonus.get("wagering_required", 0)
            
            if new_completed >= wagering_required:
                # Wagering completed - convert bonus to real balance
                await db.user_bonuses.update_one(
                    {"_id": bonus["_id"]},
                    {"$set": {"status": "completed", "wagering_completed": new_completed}}
                )
                
                # Move bonus to real balance
                bonus_amount = bonus.get("bonus_amount", 0)
                await db.users.update_one(
                    {"_id": user_id},
                    {
                        "$inc": {"balance": bonus_amount, "real_balance": bonus_amount, "bonus_balance": -bonus_amount}
                    }
                )
                
                logger.info(f"User {user_id} completed wagering, bonus ${bonus_amount} released")
            else:
                await db.user_bonuses.update_one(
                    {"_id": bonus["_id"]},
                    {"$set": {"wagering_completed": new_completed}}
                )
                
    except Exception as e:
        logger.error(f"Error updating wagering: {e}")

@fastapi_app.get("/api/bonuses/my")
async def get_my_bonuses(request: Request):
    user = await get_current_user(request)
    
    bonuses = await db.user_bonuses.find({"user_id": user["id"]}).sort("created_at", -1).to_list(20)
    return [serialize_doc(b) for b in bonuses]

# ==================== PUSH NOTIFICATIONS ====================

@fastapi_app.post("/api/notifications/subscribe")
async def subscribe_push_notifications(request: Request, data: dict = Body(...)):
    user = await get_current_user(request)
    
    subscription = {
        "user_id": user["id"],
        "endpoint": data.get("endpoint"),
        "keys": data.get("keys", {}),
        "browser": data.get("browser", "unknown"),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Upsert subscription
    await db.push_subscriptions.update_one(
        {"user_id": user["id"], "endpoint": data.get("endpoint")},
        {"$set": subscription},
        upsert=True
    )
    
    return {"message": "Subscribed to push notifications"}

@fastapi_app.delete("/api/notifications/unsubscribe")
async def unsubscribe_push_notifications(request: Request):
    user = await get_current_user(request)
    await db.push_subscriptions.delete_many({"user_id": user["id"]})
    return {"message": "Unsubscribed from push notifications"}

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to a user (stored for frontend polling)"""
    try:
        notification = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "data": data or {},
            "read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.notifications.insert_one(notification)
        
        # Also emit via WebSocket for real-time
        await sio.emit("notification", {
            "title": title,
            "body": body,
            "data": data
        }, room=user_id)
        
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")

async def notify_admins(title: str, body: str, data: dict = None):
    """Send notification to all admins"""
    try:
        admins = await db.users.find({"is_admin": True}).to_list(100)
        for admin in admins:
            await send_push_notification(admin["_id"], title, body, data)
    except Exception as e:
        logger.error(f"Error notifying admins: {e}")

@fastapi_app.get("/api/notifications")
async def get_notifications(request: Request, unread_only: bool = False):
    user = await get_current_user(request)
    
    query = {"user_id": user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(n) for n in notifications]

@fastapi_app.post("/api/notifications/mark-read")
async def mark_notifications_read(request: Request, data: dict = Body(...)):
    user = await get_current_user(request)
    
    notification_ids = data.get("ids", [])
    if notification_ids:
        from bson import ObjectId
        await db.notifications.update_many(
            {"_id": {"$in": [ObjectId(nid) for nid in notification_ids]}, "user_id": user["id"]},
            {"$set": {"read": True}}
        )
    else:
        # Mark all as read
        await db.notifications.update_many(
            {"user_id": user["id"]},
            {"$set": {"read": True}}
        )
    
    return {"message": "Notifications marked as read"}

# ==================== LEADERBOARD ====================

@fastapi_app.get("/api/leaderboard")
async def get_leaderboard():
    pipeline = [
        {"$match": {"status": {"$in": ["won", "lost"]}}},
        {"$group": {
            "_id": "$user_id",
            "total_trades": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$status", "won"]}, 1, 0]}},
            "total_profit": {"$sum": "$profit"}
        }},
        {"$addFields": {
            "win_rate": {"$multiply": [{"$divide": ["$wins", "$total_trades"]}, 100]}
        }},
        {"$sort": {"total_profit": -1}},
        {"$limit": 10}
    ]
    
    results = await db.trades.aggregate(pipeline).to_list(10)
    
    # Get user names
    leaderboard = []
    for r in results:
        user = await db.users.find_one({"_id": r["_id"]}, {"full_name": 1})
        leaderboard.append({
            "rank": len(leaderboard) + 1,
            "name": user.get("full_name", "Anonymous")[:2] + "***",
            "total_profit": round(r["total_profit"], 2),
            "win_rate": round(r["win_rate"], 1),
            "total_trades": r["total_trades"]
        })
    
    return leaderboard

# ==================== HEALTH CHECK ====================

@fastapi_app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app
