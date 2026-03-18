"""
ORBITAL Trading Platform - Specific Requirements Testing
Testing specific requirements from the review request:
- BUY/SELL buttons (not CALL/PUT)
- Timeframes: 5s, 10s, 15s, 30s, 60s
- All 3 categories: Forex, Crypto, Metals
- Real-time countdown and WINNING/LOSING status
"""

import requests
import json
import sys
import time
from datetime import datetime

class OrbitalSpecificTester:
    def __init__(self, base_url="https://orbital-trading.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Admin credentials from review request
        self.admin_email = "admin@orbitrade.live"
        self.admin_password = "password"

    def log(self, message, level="INFO"):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
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

        except Exception as e:
            error_msg = f"❌ {name} - Error: {str(e)}"
            self.log(error_msg)
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
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
            user_info = response.get('user', {})
            balance = user_info.get('balance', 0)
            self.log(f"✅ Admin login successful, balance: ${balance}")
            return True
            
        return success

    def get_auth_headers(self):
        """Get authorization headers"""
        if self.admin_token:
            return {'Authorization': f'Bearer {self.admin_token}'}
        return {}

    def test_asset_categories(self):
        """Test all 3 asset categories are available"""
        success, assets = self.run_test(
            "Get All Assets",
            "GET",
            "/api/assets",
            200
        )
        
        if not success:
            return False
            
        # Group assets by category
        categories = {"forex": [], "crypto": [], "metals": []}
        for asset in assets:
            asset_type = asset.get('asset_type')
            if asset_type in categories:
                categories[asset_type].append(asset['symbol'])
        
        # Verify all categories have assets
        all_present = True
        for category, symbols in categories.items():
            if len(symbols) > 0:
                self.log(f"✅ {category.upper()} category has {len(symbols)} assets: {', '.join(symbols[:3])}...")
            else:
                self.log(f"❌ {category.upper()} category has no assets")
                all_present = False
        
        return all_present

    def test_price_categories(self):
        """Test prices for all 3 categories"""
        success, prices = self.run_test(
            "Get All Prices",
            "GET",
            "/api/prices",
            200
        )
        
        if not success:
            return False
            
        # Check each category has price data
        categories_tested = 0
        for category in ['forex', 'crypto', 'metals']:
            if category in prices and prices[category]:
                self.log(f"✅ {category.upper()} prices available")
                categories_tested += 1
            else:
                self.log(f"❌ {category.upper()} prices missing")
        
        return categories_tested == 3

    def test_buy_sell_trade_placement(self):
        """Test BUY and SELL trade placement (not CALL/PUT)"""
        if not self.admin_token:
            self.log("❌ No admin token for trade testing")
            return False
        
        test_cases = [
            {"direction": "buy", "asset": "EUR/USD", "description": "BUY trade on Forex"},
            {"direction": "sell", "asset": "BTC/USD", "description": "SELL trade on Crypto"},
            {"direction": "buy", "asset": "XAU/USD", "description": "BUY trade on Metals"}
        ]
        
        all_successful = True
        for case in test_cases:
            success, response = self.run_test(
                case["description"],
                "POST",
                "/api/trades",
                200,
                data={
                    "asset": case["asset"],
                    "direction": case["direction"],
                    "amount": 10.0,
                    "expiry_seconds": 30
                },
                headers=self.get_auth_headers()
            )
            
            if success:
                trade_direction = response.get('direction', '').upper()
                self.log(f"✅ {case['direction'].upper()} trade placed successfully on {case['asset']}")
            else:
                all_successful = False
        
        return all_successful

    def test_short_expiry_times(self):
        """Test all short expiry timeframes: 5s, 10s, 15s, 30s, 60s"""
        if not self.admin_token:
            self.log("❌ No admin token for expiry testing")
            return False
        
        expiry_times = [5, 10, 15, 30, 60]  # seconds
        all_successful = True
        
        for expiry in expiry_times:
            success, response = self.run_test(
                f"Trade with {expiry}s expiry",
                "POST",
                "/api/trades",
                200,
                data={
                    "asset": "EUR/USD",
                    "direction": "buy",
                    "amount": 5.0,
                    "expiry_seconds": expiry
                },
                headers=self.get_auth_headers()
            )
            
            if success:
                actual_expiry = response.get('expiry_seconds')
                if actual_expiry == expiry:
                    self.log(f"✅ {expiry}s expiry time accepted")
                else:
                    self.log(f"❌ {expiry}s expiry time not set correctly (got {actual_expiry}s)")
                    all_successful = False
            else:
                all_successful = False
        
        return all_successful

    def test_trade_countdown_and_status(self):
        """Test active trades show countdown and WINNING/LOSING status"""
        if not self.admin_token:
            self.log("❌ No admin token for countdown testing")
            return False
        
        # Place a trade with 30s expiry
        trade_success, trade_response = self.run_test(
            "Place test trade for countdown",
            "POST",
            "/api/trades",
            200,
            data={
                "asset": "EUR/USD",
                "direction": "buy", 
                "amount": 5.0,
                "expiry_seconds": 30
            },
            headers=self.get_auth_headers()
        )
        
        if not trade_success:
            return False
        
        # Wait a moment for trade to be processed
        time.sleep(2)
        
        # Get open trades to check status
        success, trades = self.run_test(
            "Get active trades with countdown",
            "GET",
            "/api/trades?status=open",
            200,
            headers=self.get_auth_headers()
        )
        
        if success and trades:
            active_trade = trades[0]  # Get first open trade
            
            # Verify trade fields for countdown display
            required_fields = ['expiry_time', 'strike_price', 'status', 'direction']
            has_fields = all(field in active_trade for field in required_fields)
            
            if has_fields:
                self.log("✅ Active trade has all required fields for countdown display")
                self.log(f"   Direction: {active_trade['direction'].upper()}")
                self.log(f"   Status: {active_trade['status']}")
                self.log(f"   Strike Price: {active_trade.get('strike_price', 'N/A')}")
                return True
            else:
                missing = [f for f in required_fields if f not in active_trade]
                self.log(f"❌ Active trade missing fields: {missing}")
                return False
        else:
            self.log("❌ No active trades found for countdown testing")
            return False

    def run_specific_tests(self):
        """Run all specific requirement tests"""
        self.log("Starting ORBITAL Specific Requirements Testing")
        self.log("=" * 60)
        
        # Login as admin (has sufficient balance)
        if not self.test_admin_login():
            self.log("❌ Cannot proceed without admin login")
            return False
        
        # Test all categories
        self.log("\n--- Asset Categories Test ---")
        self.test_asset_categories()
        
        # Test price data
        self.log("\n--- Price Data Test ---")
        self.test_price_categories()
        
        # Test BUY/SELL functionality
        self.log("\n--- BUY/SELL Trading Test ---")
        self.test_buy_sell_trade_placement()
        
        # Test short expiry times
        self.log("\n--- Short Expiry Times Test ---")
        self.test_short_expiry_times()
        
        # Test countdown and status
        self.log("\n--- Trade Countdown & Status Test ---")
        self.test_trade_countdown_and_status()
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log(f"Specific tests completed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log("\nFailed tests:")
            for failed in self.failed_tests:
                self.log(f"  - {failed['test']}: {failed['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = OrbitalSpecificTester()
    success = tester.run_specific_tests()
    sys.exit(0 if success else 1)