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
    def __init__(self, base_url="https://trade-orbit.preview.emergentagent.com"):
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

    def test_affiliate_info(self):
        """Test affiliate info endpoint"""
        if not self.user_token:
            self.log("❌ No user token available for affiliate test")
            return False
            
        success, response = self.run_test(
            "Affiliate Info",
            "GET",
            "/api/affiliate",
            200,
            headers=self.get_auth_headers()
        )
        
        if success and 'code' in response:
            self.log(f"✅ Affiliate code: {response.get('code')}")
            
        return success

    def test_ai_chat(self):
        """Test AI chat endpoint"""
        if not self.user_token:
            self.log("❌ No user token available for chat test")
            return False
            
        # Allow longer timeout for AI response
        success, response = self.run_test(
            "AI Chat", 
            "POST",
            "/api/chat",
            200,
            data={"message": "What is binary options trading?"},
            headers=self.get_auth_headers(),
            timeout=60  # AI responses can take time
        )
        
        if success and 'response' in response:
            self.log("✅ AI chat response received")
            # Truncate long responses for logging
            response_text = response.get('response', '')[:100]
            self.log(f"Chat response preview: {response_text}...")
            
        return success

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
        self.log("\n--- Feature Tests ---")
        self.test_affiliate_info()
        self.test_ai_chat()
        
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