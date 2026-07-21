import requests, json, random

BASE = 'http://localhost:8000/api'
suffix = random.randint(10000, 99999)

# ===== TEST 1: Register WITHOUT email (should FAIL) =====
print('=' * 60)
print('TEST 1: Register WITHOUT email (should FAIL)')
r = requests.post(f'{BASE}/register/', json={'username': f'failuser{suffix}', 'password': 'Test123456'})
print(f'  Status: {r.status_code}')
data = r.json()
assert r.status_code == 400, f'Expected 400, got {r.status_code}'
assert 'email' in data, f'Expected email error, got: {data}'
print(f'  PASS: {data}')
print()

# ===== TEST 2: Register WITH email (should SUCCEED) =====
print('=' * 60)
print('TEST 2: Register WITH email (should SUCCEED)')
r = requests.post(f'{BASE}/register/', json={
    'username': f'testuser{suffix}',
    'email': f'test{suffix}@example.com',
    'password': 'Test123456'
})
print(f'  Status: {r.status_code}')
data = r.json()
assert r.status_code == 201, f'Expected 201, got {r.status_code}: {data}'
user_id = data['user_id']
otp_code = data['otp_code']
username = data['username']
email = data['email']
print(f'  user_id: {user_id}')
print(f'  username: {username}')
print(f'  email: {email}')
print(f'  otp_code: {otp_code}')
print(f'  PASS: User created, OTP generated')
print()

# ===== TEST 3: Verify with WRONG OTP (should FAIL) =====
print('=' * 60)
print('TEST 3: Verify with WRONG OTP (should FAIL)')
r = requests.post(f'{BASE}/verify-registration-email/', json={
    'user_id': user_id,
    'otp_code': '000000'
})
print(f'  Status: {r.status_code}')
data = r.json()
assert r.status_code == 400, f'Expected 400, got {r.status_code}: {data}'
assert 'error' in data
print(f'  PASS: {data["error"]}')
print()

# ===== TEST 4: Verify with CORRECT OTP (should SUCCEED) =====
print('=' * 60)
print('TEST 4: Verify with CORRECT OTP (should SUCCEED)')
r = requests.post(f'{BASE}/verify-registration-email/', json={
    'user_id': user_id,
    'otp_code': otp_code
})
print(f'  Status: {r.status_code}')
data = r.json()
assert r.status_code == 200, f'Expected 200, got {r.status_code}: {data}'
assert data['email_verified'] == True
print(f'  PASS: {data["message"]}')
print()

# ===== TEST 5: Login after verification (should SUCCEED) =====
print('=' * 60)
print('TEST 5: Login after email verification (should SUCCEED)')
r = requests.post(f'{BASE}/token/', json={
    'username': username,
    'password': 'Test123456'
})
print(f'  Status: {r.status_code}')
assert r.status_code == 200, f'Expected 200, got {r.status_code}: {r.text}'
token = r.json()['access']
print(f'  Access token obtained: {token[:30]}...')

# Get user info
r = requests.get(f'{BASE}/user/', headers={'Authorization': f'Bearer {token}'})
user_info = r.json()
print(f'  User Info: username={user_info["username"]}, email={user_info["email"]}')
print(f'  Email verified: {user_info["profile"]["email_verified"]}')
assert user_info['profile']['email_verified'] == True
print(f'  PASS: Login successful, email is verified')
print()

# ===== TEST 6: Admin panel (if admin exists) =====
print('=' * 60)
print('TEST 6: Admin panel - login as admin')
r = requests.post(f'{BASE}/token/', json={'username': 'admin', 'password': 'admin123'})
if r.status_code == 200:
    admin_token = r.json()['access']
    print(f'  Admin login successful')
    
    r = requests.get(f'{BASE}/admin/users/', headers={'Authorization': f'Bearer {admin_token}'})
    assert r.status_code == 200
    users = r.json()
    print(f'  Admin sees {len(users)} users:')
    for u in users:
        print(f'    - {u["username"]} (superuser={u["is_superuser"]})')
    print(f'  PASS: Admin panel works')
else:
    print(f'  SKIP: Admin user not found (expected in fresh DB)')

print()
print('=' * 60)
print('ALL TESTS PASSED!')

