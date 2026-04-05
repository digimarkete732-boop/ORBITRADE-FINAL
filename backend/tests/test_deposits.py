"""
Test suite for Manual Crypto Deposit feature
Tests: POST /api/deposits, GET /api/deposits
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://orbital-trading-1.preview.emergentagent.com').rstrip('/')

# Test credentials
USER_EMAIL = "masteruser@orbitrade.live"
USER_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": USER_EMAIL, "password": USER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestDepositEndpoints:
    """Tests for manual crypto deposit feature"""
    
    def test_create_deposit_valid_tx_hash(self, api_client):
        """POST /api/deposits with valid tx_hash returns 200 with blockchain_confirming status"""
        response = api_client.post(
            f"{BASE_URL}/api/deposits",
            json={
                "amount": 100,
                "currency": "BTC",
                "tx_hash": "0xtest_valid_hash_123456789",
                "screenshot": None
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Deposit submitted"
        assert data["status"] == "blockchain_confirming"
        assert "deposit_id" in data
        assert len(data["deposit_id"]) > 0
        print(f"✓ Deposit created with ID: {data['deposit_id']}")
    
    def test_create_deposit_minimum_amount_error(self, api_client):
        """POST /api/deposits with amount < 10 returns 400 error"""
        response = api_client.post(
            f"{BASE_URL}/api/deposits",
            json={
                "amount": 5,
                "currency": "BTC",
                "tx_hash": "0xtest_small_amount",
                "screenshot": None
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        assert "10" in data["detail"].lower() or "minimum" in data["detail"].lower()
        print(f"✓ Minimum amount validation working: {data['detail']}")
    
    def test_create_deposit_with_screenshot(self, api_client):
        """POST /api/deposits with screenshot (base64) works"""
        # Small base64 test image
        test_screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = api_client.post(
            f"{BASE_URL}/api/deposits",
            json={
                "amount": 50,
                "currency": "ETH",
                "tx_hash": "0xtest_with_screenshot_789",
                "screenshot": test_screenshot
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "blockchain_confirming"
        print(f"✓ Deposit with screenshot created: {data['deposit_id']}")
    
    def test_create_deposit_different_currencies(self, api_client):
        """POST /api/deposits works with different crypto currencies"""
        currencies = ["BTC", "ETH", "USDT", "LTC", "SOL"]
        
        for currency in currencies:
            response = api_client.post(
                f"{BASE_URL}/api/deposits",
                json={
                    "amount": 25,
                    "currency": currency,
                    "tx_hash": f"0xtest_{currency.lower()}_hash",
                    "screenshot": None
                }
            )
            
            assert response.status_code == 200, f"Failed for {currency}: {response.text}"
            print(f"✓ Deposit created for {currency}")
    
    def test_get_user_deposits(self, api_client):
        """GET /api/deposits returns list of user deposits"""
        response = api_client.get(f"{BASE_URL}/api/deposits")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of deposits"
        
        if len(data) > 0:
            deposit = data[0]
            # Verify deposit structure
            assert "id" in deposit
            assert "amount" in deposit
            assert "currency" in deposit
            assert "tx_hash" in deposit
            assert "status" in deposit
            assert "created_at" in deposit
            print(f"✓ Found {len(data)} deposits with correct structure")
        else:
            print("✓ Deposits endpoint returns empty list (no deposits yet)")
    
    def test_deposit_status_is_blockchain_confirming(self, api_client):
        """Verify new deposits have blockchain_confirming status"""
        # Create a new deposit
        response = api_client.post(
            f"{BASE_URL}/api/deposits",
            json={
                "amount": 100,
                "currency": "BTC",
                "tx_hash": f"0xtest_status_check_{os.urandom(4).hex()}",
                "screenshot": None
            }
        )
        
        assert response.status_code == 200
        deposit_id = response.json()["deposit_id"]
        
        # Get deposits and find the one we just created
        get_response = api_client.get(f"{BASE_URL}/api/deposits")
        assert get_response.status_code == 200
        
        deposits = get_response.json()
        created_deposit = next((d for d in deposits if d["id"] == deposit_id), None)
        
        assert created_deposit is not None, "Created deposit not found in list"
        assert created_deposit["status"] == "blockchain_confirming"
        print(f"✓ Deposit {deposit_id} has correct status: blockchain_confirming")


class TestDepositAuthentication:
    """Tests for deposit endpoint authentication"""
    
    def test_create_deposit_without_auth(self):
        """POST /api/deposits without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/deposits",
            json={
                "amount": 100,
                "currency": "BTC",
                "tx_hash": "0xtest_no_auth",
                "screenshot": None
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated request rejected with 401")
    
    def test_get_deposits_without_auth(self):
        """GET /api/deposits without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/deposits")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated GET request rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
