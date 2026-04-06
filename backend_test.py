"""
ORBITAL Trading Platform - Backend API Testing
Tests all endpoints mentioned in the review request:
- User registration/login
- Market assets and prices  
- Trading functionality
- Wallet operations
- Admin endpoints
- Affiliate system
- AI chat
- Health check
"""

import requests
import json
import sys
import time
from datetime import datetime

class OrbitalAPITester:
    def __init__(self, base_url="https://trading-orbit.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from review request
        self.test_user_email = "test@orbital.com"
        self.test_user_password = "Test123!"
        # New specific accounts from review request
        self.admin_email = "admin@orbitrade.live" 
        self.admin_password = "password"
        self.master_user_email = "masteruser@orbitrade.live"
        self.master_user_password = "password"
        self.llm_key = "sk-emergent-89b630699AdB5C7780"

    def log(self, message, level="INFO"):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
            
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=default_headers, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=default_headers, timeout=timeout)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=default_headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"❌ {name} - Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', response.text)
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                    
                self.log(error_msg)
                self.failed_tests.append({
                    'test': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'error': error_detail if 'error_detail' in locals() else 'Unknown error'
                })
                return False, {}

        except requests.exceptions.Timeout:
            error_msg = f"❌ {name} - Request timeout after {timeout}s"
            self.log(error_msg)
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint, 
                'error': 'Request timeout'
            })
            return False, {}
        except Exception as e:
            error_msg = f"❌ {name} - Error: {str(e)}"
            self.log(error_msg)
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "/api/health",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/api/auth/register",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password, 
                "full_name": "Test User"
            }
        )
        
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.log("✅ User token obtained")
            return True
        
        return success

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "/api/auth/login", 
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.log("✅ User login successful")
            return True
            
        return success

    def test_admin_login(self):
        """Test admin login with admin@orbitrade.live"""
        success, response = self.run_test(
            "Admin Login (admin@orbitrade.live)",
            "POST",
            "/api/auth/login",
            200,
            data={
                "email": self.admin_email,
                "password": self.admin_password
            }
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            # Verify admin privileges
            user_info = response.get('user', {})
            if user_info.get('is_admin'):
                self.log("✅ Admin account has admin privileges")
            else:
                self.log("⚠️ Admin account lacks admin privileges")
            return True
            
        return success

    def test_master_user_login(self):
        """Test master user login with masteruser@orbitrade.live"""
        success, response = self.run_test(
            "Master User Login (masteruser@orbitrade.live)",
            "POST",
            "/api/auth/login",
            200,
            data={
                "email": self.master_user_email,
                "password": self.master_user_password
            }
        )
        
        if success and 'access_token' in response:
            user_info = response.get('user', {})
            balance = user_info.get('balance', 0)
            self.log(f"✅ Master user login successful, balance: ${balance}")
            return True
            
        return success

    def get_auth_headers(self, use_admin=False):
        """Get authorization headers"""
        token = self.admin_token if use_admin else self.user_token
        if token:
            return {'Authorization': f'Bearer {token}'}
        return {}

    def test_get_user_profile(self):
        """Test get current user profile"""
        if not self.user_token:
            self.log("❌ No user token available for profile test")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "/api/auth/me",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_get_assets(self):
        """Test get market assets"""
        success, response = self.run_test(
            "Get Market Assets",
            "GET",
            "/api/assets",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log(f"✅ Found {len(response)} assets")
            return True
        elif success:
            self.log("⚠️ Assets endpoint returned empty list")
            
        return success

    def test_get_prices(self):
        """Test get real-time prices"""
        success, response = self.run_test(
            "Get Real-time Prices",
            "GET", 
            "/api/prices",
            200
        )
        
        if success and isinstance(response, dict):
            has_data = any(response.get(key) for key in ['crypto', 'forex', 'metals'])
            if has_data:
                self.log("✅ Price data available")
            else:
                self.log("⚠️ Price endpoint returned empty data")
                
        return success

    def test_get_forex_prices(self):
        """Test get forex prices specifically - should be live data from cdn.jsdelivr.net API"""
        success, response = self.run_test(
            "Get Forex Prices (Live Data)",
            "GET",
            "/api/prices/forex", 
            200
        )
        
        if success and isinstance(response, dict):
            # Check for expected forex pairs
            expected_pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]
            found_pairs = [pair for pair in expected_pairs if pair in response]
            self.log(f"✅ Found forex pairs: {', '.join(found_pairs)}")
            
            # Verify live data structure (should have price and change_24h)
            if found_pairs:
                sample_pair = found_pairs[0]
                price_data = response[sample_pair]
                if isinstance(price_data, dict) and 'price' in price_data:
                    self.log("✅ Live forex data structure verified")
                
        return success

    def test_get_crypto_prices(self):
        """Test get crypto prices specifically"""
        success, response = self.run_test(
            "Get Crypto Prices", 
            "GET",
            "/api/prices/crypto",
            200
        )
        return success

    def test_get_metals_prices(self):
        """Test get metals prices specifically - should be live data from cdn.jsdelivr.net API"""
        success, response = self.run_test(
            "Get Metals Prices (Live Data)",
            "GET", 
            "/api/prices/metals",
            200
        )
        
        if success and isinstance(response, dict):
            # Check for expected metals
            expected_metals = ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD"]
            found_metals = [metal for metal in expected_metals if metal in response]
            self.log(f"✅ Found metals: {', '.join(found_metals)}")
            
            # Verify live data structure
            if found_metals:
                sample_metal = found_metals[0] 
                price_data = response[sample_metal]
                if isinstance(price_data, dict) and 'price' in price_data:
                    self.log("✅ Live metals data structure verified")
                
        return success

    def test_place_trade(self):
        """Test placing a binary option trade"""
        if not self.user_token:
            self.log("❌ No user token available for trading test")
            return False
            
        success, response = self.run_test(
            "Place Binary Option Trade",
            "POST",
            "/api/trades",
            200,
            data={
                "asset": "EUR/USD",
                "direction": "call", 
                "amount": 100.0,
                "expiry_seconds": 60
            },
            headers=self.get_auth_headers()
        )
        
        if success and 'id' in response:
            self.log("✅ Trade placed successfully")
            # Store trade ID for potential cleanup
            return True
            
        return success

    def test_get_open_trades(self):
        """Test getting open trades"""
        if not self.user_token:
            self.log("❌ No user token available for trades test")
            return False
            
        success, response = self.run_test(
            "Get Open Trades",
            "GET",
            "/api/trades?status=open",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_get_trade_history(self):
        """Test getting trade history"""
        if not self.user_token:
            self.log("❌ No user token available for history test")  
            return False
            
        success, response = self.run_test(
            "Get Trade History",
            "GET",
            "/api/trades",
            200,
            headers=self.get_auth_headers()
        )
        return success

    def test_get_wallet_balance(self):
        """Test getting wallet balance"""
        if not self.user_token:
            self.log("❌ No user token available for wallet test")
            return False
            
        success, response = self.run_test(
            "Get Wallet Balance",
            "GET",
            "/api/wallet",
            200,
            headers=self.get_auth_headers()
        )
        
        if success and 'balance' in response:
            self.log(f"✅ Wallet balance: ${response.get('balance', 0):.2f}")
            
        return success

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            self.log("❌ No admin token available for stats test")
            return False
            
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "/api/admin/stats",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success and isinstance(response, dict):
            stats = ['total_users', 'active_users', 'total_trades', 'daily_volume']
            found_stats = [stat for stat in stats if stat in response]
            self.log(f"✅ Admin stats include: {', '.join(found_stats)}")
            
        return success

    def test_admin_users_list(self):
        """Test admin users list endpoint"""
        if not self.admin_token:
            self.log("❌ No admin token available for users test")
            return False
            
        success, response = self.run_test(
            "Admin Users List",
            "GET",
            "/api/admin/users", 
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success and 'users' in response:
            user_count = len(response.get('users', []))
            self.log(f"✅ Found {user_count} users in admin panel")
            
        return success

    def test_affiliate_stats(self):
        """Test affiliate stats endpoint - NEW FEATURE"""
        if not self.user_token:
            self.log("❌ No user token available for affiliate stats test")
            return False
            
        success, response = self.run_test(
            "Affiliate Stats (/api/affiliate/stats)",
            "GET",
            "/api/affiliate/stats",
            200,
            headers=self.get_auth_headers()
        )
        
        if success and isinstance(response, dict):
            # Check for expected affiliate data
            expected_fields = ['referral_code', 'total_referrals', 'total_earned', 'direct_earned', 'revenue_share_earned']
            found_fields = [field for field in expected_fields if field in response]
            self.log(f"✅ Affiliate stats fields: {', '.join(found_fields)}")
            
            if 'referral_code' in response:
                self.log(f"✅ Referral code: {response.get('referral_code')}")
            if 'total_earned' in response:
                self.log(f"✅ Total earned: ${response.get('total_earned', 0):.2f}")
            
        return success

    def test_affiliate_commission_structure(self):
        """Test affiliate commission structure endpoint"""
        success, response = self.run_test(
            "Affiliate Commission Structure",
            "GET",
            "/api/affiliate/commission-structure",
            200
        )
        
        if success and isinstance(response, dict):
            # Check for commission structure fields
            expected_fields = ['direct_percent', 'indirect_percent', 'revenue_share_percent', 'levels']
            found_fields = [field for field in expected_fields if field in response]
            self.log(f"✅ Commission structure: {', '.join(found_fields)}")
            
            if 'direct_percent' in response:
                self.log(f"✅ Direct commission: {response.get('direct_percent')}%")
            if 'indirect_percent' in response:
                self.log(f"✅ Indirect commission: {response.get('indirect_percent')}%")
            if 'revenue_share_percent' in response:
                self.log(f"✅ Revenue share: {response.get('revenue_share_percent')}%")
                
        return success

    def test_manual_crypto_deposit(self):
        """Test manual crypto deposit endpoint - NEW FEATURE"""
        # Use admin token since user registration might fail
        token = self.admin_token if self.admin_token else self.user_token
        if not token:
            self.log("❌ No token available for deposit test")
            return False
            
        success, response = self.run_test(
            "Manual Crypto Deposit (/api/deposits POST)",
            "POST",
            "/api/deposits",
            200,
            data={
                "amount": 100.0,
                "currency": "USDT_TRC20",
                "tx_hash": "test_tx_hash_12345abcdef",
                "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if success and isinstance(response, dict):
            # Check for expected deposit response fields
            expected_fields = ['user_id', 'amount', 'currency', 'tx_hash', 'status']
            found_fields = [field for field in expected_fields if field in response]
            self.log(f"✅ Deposit response fields: {', '.join(found_fields)}")
            
            if 'status' in response:
                self.log(f"✅ Deposit status: {response.get('status')}")
            if 'amount' in response:
                self.log(f"✅ Deposit amount: ${response.get('amount')}")
                
        return success

    def test_get_my_deposits(self):
        """Test get my deposits endpoint"""
        # Use admin token since user registration might fail
        token = self.admin_token if self.admin_token else self.user_token
        if not token:
            self.log("❌ No token available for deposits test")
            return False
            
        success, response = self.run_test(
            "Get My Deposits",
            "GET",
            "/api/deposits/my",
            200,
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if success and isinstance(response, list):
            self.log(f"✅ Found {len(response)} deposits")
            
        return success

    def test_affiliate_stats(self):
        """Test affiliate stats endpoint - NEW FEATURE"""
        # Use admin token since user registration might fail
        token = self.admin_token if self.admin_token else self.user_token
        if not token:
            self.log("❌ No token available for affiliate stats test")
            return False
            
        success, response = self.run_test(
            "Affiliate Stats (/api/affiliate/stats)",
            "GET",
            "/api/affiliate/stats",
            200,
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if success and isinstance(response, dict):
            # Check for expected affiliate data
            expected_fields = ['referral_code', 'total_referrals', 'total_earned', 'direct_earned', 'revenue_share_earned']
            found_fields = [field for field in expected_fields if field in response]
            self.log(f"✅ Affiliate stats fields: {', '.join(found_fields)}")
            
            if 'referral_code' in response:
                self.log(f"✅ Referral code: {response.get('referral_code')}")
            if 'total_earned' in response:
                self.log(f"✅ Total earned: ${response.get('total_earned', 0):.2f}")
            
        return success

    def test_password_reset_flow(self):
        """Test password reset flow - NEW FEATURE"""
        # Step 1: Request password reset
        success1, response1 = self.run_test(
            "Password Reset Request (/api/auth/forgot-password)",
            "POST",
            "/api/auth/forgot-password",
            200,
            data={"email": self.test_user_email}
        )
        
        if not success1:
            return False
            
        # Check if reset token is returned (for testing)
        reset_token = None
        if isinstance(response1, dict) and 'reset_token' in response1:
            reset_token = response1['reset_token']
            self.log(f"✅ Reset token received: {reset_token}")
        else:
            self.log("✅ Password reset request processed (token sent via email)")
            # For production, we won't get the token back, so we'll use a test token
            reset_token = "123456"  # Test token
            
        # Step 2: Reset password with token
        success2, response2 = self.run_test(
            "Password Reset Confirm (/api/auth/reset-password)",
            "POST",
            "/api/auth/reset-password",
            200,
            data={
                "token": reset_token,
                "new_password": "NewPassword123!"
            }
        )
        
        if success2:
            self.log("✅ Password reset flow completed successfully")
            
        return success1 and success2

    def test_admin_commission_structure(self):
        """Test admin commission structure endpoints - NEW FEATURE"""
        if not self.admin_token:
            self.log("❌ No admin token available for commission structure test")
            return False
            
        # Test GET commission structure
        success1, response1 = self.run_test(
            "Get Admin Commission Structure",
            "GET",
            "/api/admin/commission-structure",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if not success1:
            return False
            
        # Test POST commission structure (save/update)
        success2, response2 = self.run_test(
            "Save Admin Commission Structure",
            "POST",
            "/api/admin/commission-structure",
            200,
            data={
                "direct_percent": 5.0,
                "indirect_percent": 2.0,
                "revenue_share_percent": 10.0,
                "levels": 3,
                "active": True
            },
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success1 and success2:
            self.log("✅ Admin commission structure endpoints working")
            
        return success1 and success2

    def test_admin_deposits(self):
        """Test admin deposits endpoint"""
        if not self.admin_token:
            self.log("❌ No admin token available for admin deposits test")
            return False
            
        success, response = self.run_test(
            "Admin Deposits List",
            "GET",
            "/api/admin/deposits",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success and isinstance(response, list):
            self.log(f"✅ Admin found {len(response)} deposits")
            
        return success

    def test_platform_settings(self):
        """Test platform settings (Win Rate Control) endpoints"""
        if not self.admin_token:
            self.log("❌ No admin token available for platform settings test")
            return False
            
        # Test GET platform settings
        success1, response1 = self.run_test(
            "Get Platform Settings (Win Rate Control)",
            "GET",
            "/api/admin/platform-settings",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success1 and isinstance(response1, dict):
            if 'platform_win_rate' in response1:
                self.log(f"✅ Current platform win rate: {response1['platform_win_rate']}%")
            
        # Test POST platform settings (save)
        success2, response2 = self.run_test(
            "Save Platform Settings (Win Rate Control)",
            "POST",
            "/api/admin/platform-settings",
            200,
            data={
                "platform_win_rate": 45,
                "min_win_rate": 30,
                "max_win_rate": 60,
                "asset_overrides": {}
            },
            headers=self.get_auth_headers(use_admin=True)
        )
        
        return success1 and success2

    def test_tournaments(self):
        """Test tournaments endpoints"""
        # Test GET tournaments (public endpoint)
        success1, response1 = self.run_test(
            "Get Tournaments List",
            "GET",
            "/api/tournaments",
            200
        )
        
        if success1 and isinstance(response1, list):
            self.log(f"✅ Found {len(response1)} tournaments")
            for tournament in response1[:3]:  # Show first 3
                name = tournament.get('name', 'Unknown')
                status = tournament.get('status', 'unknown')
                prize_pool = tournament.get('prize_pool', 0)
                self.log(f"   - {name} ({status}) - ${prize_pool} prize pool")
        
        # Test admin create tournament
        if not self.admin_token:
            self.log("❌ No admin token available for tournament creation test")
            return success1
            
        success2, response2 = self.run_test(
            "Create Tournament (Admin)",
            "POST",
            "/api/admin/tournaments",
            200,
            data={
                "name": "API Test Tournament",
                "description": "Tournament created via API test",
                "tournament_type": "weekly",
                "prize_pool": 1000,
                "prizes": [500, 300, 200],
                "start_date": "2026-01-01T00:00:00",
                "end_date": "2026-01-08T00:00:00"
            },
            headers=self.get_auth_headers(use_admin=True)
        )
        
        # Test tournament leaderboard (if tournaments exist)
        if success1 and response1 and len(response1) > 0:
            tournament_id = response1[0].get('id')
            if tournament_id:
                success3, response3 = self.run_test(
                    "Get Tournament Leaderboard",
                    "GET",
                    f"/api/tournaments/{tournament_id}/leaderboard",
                    200
                )
                if success3 and isinstance(response3, list):
                    self.log(f"✅ Tournament leaderboard has {len(response3)} participants")
        
        return success1 and (success2 if self.admin_token else True)

    def test_notifications(self):
        """Test notifications endpoints"""
        if not self.admin_token:
            self.log("❌ No admin token available for notifications test")
            return False
            
        # Test GET notifications
        success1, response1 = self.run_test(
            "Get Notifications",
            "GET",
            "/api/notifications",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success1 and isinstance(response1, list):
            self.log(f"✅ Found {len(response1)} notifications")
            for notification in response1[:3]:  # Show first 3
                title = notification.get('title', 'No title')
                type_val = notification.get('type', 'unknown')
                self.log(f"   - {title} ({type_val})")
        
        # Test unread notifications
        success2, response2 = self.run_test(
            "Get Unread Notifications",
            "GET",
            "/api/notifications?unread_only=true",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success2 and isinstance(response2, list):
            self.log(f"✅ Found {len(response2)} unread notifications")
        
        return success1 and success2

    def test_promotions_with_wagering(self):
        """Test promotions with wagering requirements (Deposit Bonus System)"""
        if not self.admin_token:
            self.log("❌ No admin token available for promotions test")
            return False
            
        # Test GET promotions
        success1, response1 = self.run_test(
            "Get Promotions (Deposit Bonus System)",
            "GET",
            "/api/admin/promotions",
            200,
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success1 and isinstance(response1, list):
            self.log(f"✅ Found {len(response1)} promotions")
            for promo in response1[:3]:  # Show first 3
                name = promo.get('name', 'Unknown')
                bonus_percent = promo.get('bonus_percent', 0)
                wagering_req = promo.get('wagering_requirement', 'N/A')
                self.log(f"   - {name}: {bonus_percent}% bonus, {wagering_req}x wagering")
        
        # Test POST create promotion with wagering requirement
        success2, response2 = self.run_test(
            "Create Promotion with Wagering Requirement",
            "POST",
            "/api/admin/promotions",
            200,
            data={
                "name": "API Test Bonus",
                "bonus_percent": 50,
                "min_deposit": 100,
                "max_bonus": 500,
                "wagering_requirement": 30,
                "active": True
            },
            headers=self.get_auth_headers(use_admin=True)
        )
        
        if success2:
            self.log("✅ Promotion with wagering requirement created successfully")
        
        return success1 and success2

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        self.log("Starting ORBITAL Trading Platform Backend Tests")
        self.log("=" * 60)
        
        # Basic health check
        self.test_health_check()
        
        # Authentication tests
        self.log("\n--- Authentication Tests ---")
        registration_success = self.test_user_registration()
        if not registration_success:
            # If registration fails, try login instead
            self.test_user_login()
            
        self.test_get_user_profile()
        self.test_admin_login()
        self.test_master_user_login()
        
        # Market data tests  
        self.log("\n--- Market Data Tests ---")
        self.test_get_assets()
        self.test_get_prices()
        self.test_get_forex_prices()
        self.test_get_crypto_prices()
        self.test_get_metals_prices()
        
        # Trading tests
        self.log("\n--- Trading Tests ---")
        self.test_place_trade()
        self.test_get_open_trades()
        self.test_get_trade_history()
        self.test_get_wallet_balance()
        
        # Admin tests
        self.log("\n--- Admin Tests ---")
        self.test_admin_stats()
        self.test_admin_users_list()
        
        # Feature tests
        self.log("\n--- New Feature Tests ---")
        self.test_affiliate_stats()
        self.test_affiliate_commission_structure()
        self.test_manual_crypto_deposit()
        self.test_get_my_deposits()
        self.test_password_reset_flow()
        
        # Admin feature tests
        self.log("\n--- Admin Feature Tests ---")
        self.test_admin_commission_structure()
        self.test_admin_deposits()
        
        # New Production Features Tests
        self.log("\n--- New Production Features Tests ---")
        self.test_platform_settings()
        self.test_tournaments()
        self.test_notifications()
        self.test_promotions_with_wagering()
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log("\nFailed tests:")
            for failed in self.failed_tests:
                self.log(f"  - {failed['test']}: {failed['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = OrbitalAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)