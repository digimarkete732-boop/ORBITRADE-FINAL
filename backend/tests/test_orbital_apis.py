"""
ORBITAL Trading Platform - Backend API Tests
Testing all critical endpoints for binary options trading
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_USER_EMAIL = "masteruser@orbitrade.live"
MASTER_USER_PASSWORD = "password"
ADMIN_EMAIL = "admin@orbitrade.live"
ADMIN_PASSWORD = "password"


class TestHealthAndBasics:
    """Health check and basic endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("✓ Health check passed")

    def test_assets_endpoint(self):
        """Test /api/assets returns all asset categories"""
        response = requests.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200
        data = response.json()
        
        # Verify we have assets
        assert len(data) > 0
        
        # Verify all three categories exist
        asset_types = set(a["asset_type"] for a in data)
        assert "forex" in asset_types, "Missing forex assets"
        assert "crypto" in asset_types, "Missing crypto assets"
        assert "metals" in asset_types, "Missing metals assets"
        
        # Verify forex assets
        forex = [a for a in data if a["asset_type"] == "forex"]
        assert len(forex) >= 6, f"Expected at least 6 forex pairs, got {len(forex)}"
        print(f"✓ Assets endpoint: {len(forex)} forex, {len([a for a in data if a['asset_type'] == 'crypto'])} crypto, {len([a for a in data if a['asset_type'] == 'metals'])} metals")

    def test_prices_endpoint(self):
        """Test /api/prices returns live prices for all categories"""
        response = requests.get(f"{BASE_URL}/api/prices")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all price categories
        assert "forex" in data, "Missing forex prices"
        assert "crypto" in data, "Missing crypto prices"
        assert "metals" in data, "Missing metals prices"
        
        # Verify forex prices
        assert len(data["forex"]) > 0, "No forex prices"
        assert "EUR/USD" in data["forex"], "Missing EUR/USD price"
        
        # Verify crypto prices
        assert len(data["crypto"]) > 0, "No crypto prices"
        
        # Verify metals prices with gold > $3000
        assert "XAU/USD" in data["metals"], "Missing gold price"
        gold_price = data["metals"]["XAU/USD"]["price"]
        assert gold_price > 3000, f"Gold price ${gold_price} should be > $3000"
        print(f"✓ Prices endpoint: Gold at ${gold_price:.2f}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_masteruser(self):
        """Test login with master user credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_USER_EMAIL,
            "password": MASTER_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == MASTER_USER_EMAIL
        print(f"✓ Master user login successful: {data['user']['full_name']}")
        return data["access_token"]
    
    def test_login_admin(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["user"]["is_admin"] == True
        print("✓ Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Test login fails with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")


class TestTrading:
    """Trading endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for master user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_USER_EMAIL,
            "password": MASTER_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_place_buy_trade(self, auth_token):
        """Test placing a BUY trade"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/trades", 
            headers=headers,
            json={
                "asset": "EUR/USD",
                "direction": "buy",
                "amount": 10,
                "expiry_seconds": 30
            })
        assert response.status_code == 200
        data = response.json()
        
        assert data["direction"] == "buy"
        assert data["asset"] == "EUR/USD"
        assert data["status"] == "open"
        assert "strike_price" in data
        print(f"✓ BUY trade placed: EUR/USD at {data['strike_price']}")
    
    def test_place_sell_trade(self, auth_token):
        """Test placing a SELL trade"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/trades", 
            headers=headers,
            json={
                "asset": "BTC/USD",
                "direction": "sell",
                "amount": 10,
                "expiry_seconds": 15
            })
        assert response.status_code == 200
        data = response.json()
        
        assert data["direction"] == "sell"
        assert data["asset"] == "BTC/USD"
        print(f"✓ SELL trade placed: BTC/USD at {data['strike_price']}")
    
    def test_short_expiry_times(self, auth_token):
        """Test all short expiry times are accepted"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        valid_expiries = [5, 10, 15, 30, 60]
        
        for expiry in valid_expiries:
            response = requests.post(f"{BASE_URL}/api/trades", 
                headers=headers,
                json={
                    "asset": "EUR/USD",
                    "direction": "buy",
                    "amount": 5,
                    "expiry_seconds": expiry
                })
            assert response.status_code == 200, f"Failed for expiry {expiry}s"
        print(f"✓ All expiry times work: {valid_expiries}")
    
    def test_get_trades(self, auth_token):
        """Test getting trade history"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/trades", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} trades")


class TestAIPrediction:
    """AI Prediction endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_USER_EMAIL,
            "password": MASTER_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_prediction_endpoint(self, auth_token):
        """Test AI prediction returns buy/sell confidence"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/predict",
            headers=headers,
            json={
                "asset": "EUR/USD",
                "asset_type": "forex",
                "current_price": 1.0945,
                "price_history": [1.0940, 1.0942, 1.0944, 1.0943, 1.0945]
            })
        assert response.status_code == 200
        data = response.json()
        
        assert "buy_confidence" in data
        assert "sell_confidence" in data
        assert "reasoning" in data
        assert 0 <= data["buy_confidence"] <= 100
        assert 0 <= data["sell_confidence"] <= 100
        # Confidences should sum to 100 (normalized)
        total = data["buy_confidence"] + data["sell_confidence"]
        assert total == 100, f"Confidences should sum to 100, got {total}"
        print(f"✓ AI Prediction: BUY {data['buy_confidence']}% / SELL {data['sell_confidence']}%")


class TestAIChat:
    """AI Chat endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_USER_EMAIL,
            "password": MASTER_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_chat_endpoint(self, auth_token):
        """Test AI chat responds to messages"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/chat",
            headers=headers,
            json={
                "message": "What is binary options trading?"
            })
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        assert len(data["response"]) > 0
        print(f"✓ AI Chat response received ({len(data['response'])} chars)")


class TestWallet:
    """Wallet and transaction tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_USER_EMAIL,
            "password": MASTER_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_wallet_balance(self, auth_token):
        """Test wallet returns balance"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "balance" in data
        assert "bonus_balance" in data
        assert "total" in data
        print(f"✓ Wallet balance: ${data['balance']:.2f}")
    
    def test_transactions(self, auth_token):
        """Test transactions endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/transactions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Transactions: {len(data)} records")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
