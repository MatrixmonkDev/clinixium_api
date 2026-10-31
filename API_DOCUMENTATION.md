# Clinixium API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require JWT access token in Authorization header:
```
Authorization: Bearer <access_token>
```

**Token System:**
- **Access Token**: 15 minutes expiry (for API calls)
- **Refresh Token**: 30 days expiry (for getting new access tokens)

---

## API Endpoints

### Health & Info

#### Health Check
```http
GET /health
```
**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-10-29T10:00:00.000Z"
}
```

#### API Info
```http
GET /
```
**Response:**
```json
{
  "success": true,
  "message": "Clinixium API",
  "version": "1.0.0"
}
```

---

## Generic Auth Endpoints (All Users)

### 1. Refresh Access Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

---

### 2. Logout
```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Physician Endpoints

### 3. Physician Register
```http
POST /api/physicians/auth/register
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_country_code": "+1",
  "phone_number": "5551234567",
  "professional_title": "MD",
  "timezone": "America/New_York",
  "language": "en"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here",
    "physician": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

### 4. Physician Login
```http
POST /api/physicians/auth/login
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "SecurePass123!"
}
```

**Response - Success without 2FA (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here",
    "physician": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "two_factor_enabled": false
    }
  }
}
```

**Response - 2FA Required (200 OK):**
```json
{
  "success": true,
  "requiresTwoFactor": true,
  "message": "Two-factor authentication required",
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error - Invalid Credentials (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Error - Account Locked (423 Locked):**
```json
{
  "success": false,
  "message": "Account is temporarily locked due to too many failed attempts",
  "lockedUntil": "2026-10-29T10:30:00.000Z"
}
```

---

### 5. Verify Two-Factor Authentication
```http
POST /api/physicians/auth/2fa/verify
```

**Headers:**
```
Authorization: Bearer <tempToken>
```

**Request Body:**
```json
{
  "two_factor_code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor verification successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here",
    "physician": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "two_factor_enabled": true
    }
  }
}
```

**Error - Invalid Code (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid two-factor code"
}
```

---

### 6. Setup Two-Factor Authentication
```http
POST /api/physicians/auth/2fa/setup
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "recoveryCodes": [
      "ABCD1234EFGH5678",
      "IJKL9012MNOP3456",
      "QRST7890UVWX1234",
      "YZAB5678CDEF9012",
      "GHIJ3456KLMN7890",
      "OPQR1234STUV5678",
      "WXYZ9012ABCD3456",
      "EFGH7890IJKL1234",
      "MNOP5678QRST9012",
      "UVWX3456YZAB7890"
    ]
  }
}
```

**Note:** Scan the QR code with Google Authenticator app. Store recovery codes safely.

---

### 7. Confirm Two-Factor Authentication
```http
POST /api/physicians/auth/2fa/confirm
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "two_factor_code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled",
  "data": {
    "recoveryCodes": [
      "ABCD1234EFGH5678",
      "IJKL9012MNOP3456",
      "QRST7890UVWX1234",
      "YZAB5678CDEF9012",
      "GHIJ3456KLMN7890",
      "OPQR1234STUV5678",
      "WXYZ9012ABCD3456",
      "EFGH7890IJKL1234",
      "MNOP5678QRST9012",
      "UVWX3456YZAB7890"
    ]
  }
}
```

**Error - Invalid Code (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid two-factor code"
}
```

---

### 8. Disable Two-Factor Authentication
```http
POST /api/physicians/auth/2fa/disable
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled"
}
```

---

### 9. Get Physician Profile
```http
GET /api/physicians/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_country_code": "+1",
    "phone_number": "5551234567",
    "professional_title": "MD",
    "profile_photo_path": null,
    "timezone": "America/New_York",
    "language": "en",
    "about_me": null,
    "primary_specialty": null,
    "career_start_year": null,
    "practice_setting": null,
    "practice_setting_other": null,
    "hospital_affiliation": null,
    "ai_annotation_experience": null,
    "npi_number": null,
    "board_certified": 0,
    "identity_status": "not_started",
    "onboarding_step": 1,
    "status": 1
  }
}
```

**Error - Not Found (404):**
```json
{
  "success": false,
  "message": "Physician not found"
}
```

---

### 10. Update Physician Profile
```http
PUT /api/physicians/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_country_code": "+1",
  "phone_number": "5551234567",
  "professional_title": "MD",
  "timezone": "America/New_York",
  "language": "en",
  "about_me": "Cardiologist with 10 years experience",
  "primary_specialty": "Cardiology",
  "career_start_year": 2015,
  "practice_setting": "hospital",
  "practice_setting_other": null,
  "hospital_affiliation": "City Hospital",
  "ai_annotation_experience": "moderate",
  "npi_number": "1234567890",
  "board_certified": true
}
```

**Fields:**
- `first_name`: 2-100 characters
- `last_name`: 2-100 characters
- `phone_country_code`: Optional
- `phone_number`: Optional
- `professional_title`: "MD" or "DO"
- `timezone`: Valid timezone string
- `language`: Language code (e.g., "en", "es")
- `about_me`: Max 2000 characters
- `primary_specialty`: Max 150 characters
- `career_start_year`: 1900-current year
- `practice_setting`: "hospital", "private_practice", "academic", "clinic", "telemedicine", "other"
- `practice_setting_other`: Max 150 characters (required if practice_setting is "other")
- `hospital_affiliation`: Max 255 characters
- `ai_annotation_experience`: "none", "some", "moderate", "expert"
- `npi_number`: Exactly 10 characters
- `board_certified`: Boolean

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_country_code": "+1",
    "phone_number": "5551234567",
    "professional_title": "MD",
    "profile_photo_path": null,
    "timezone": "America/New_York",
    "language": "en",
    "about_me": "Cardiologist with 10 years experience",
    "primary_specialty": "Cardiology",
    "career_start_year": 2015,
    "practice_setting": "hospital",
    "practice_setting_other": null,
    "hospital_affiliation": "City Hospital",
    "ai_annotation_experience": "moderate",
    "npi_number": "1234567890",
    "board_certified": 1,
    "identity_status": "not_started",
    "onboarding_step": 1,
    "status": 1
  }
}
```

---

## Physician Onboarding Endpoints

### 11. Get Onboarding Progress
```http
GET /api/physicians/onboarding/progress
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentStep": 3,
    "isCompleted": false,
    "completedSteps": 2,
    "totalSteps": 6,
    "progressPercentage": 33,
    "onboardingCompletedAt": null,
    "steps": {
      "step1": {
        "title": "Basic Profile",
        "completed": true,
        "data": {
          "first_name": "John",
          "last_name": "Doe",
          "phone_country_code": "+1",
          "phone_number": "5551234567",
          "timezone": "America/New_York",
          "language": "en"
        }
      },
      "step2": {
        "title": "Professional Details",
        "completed": true,
        "data": {
          "professional_title": "MD",
          "primary_specialty": "Cardiology",
          "career_start_year": 2015,
          "practice_setting": "hospital",
          "ai_annotation_experience": "moderate"
        }
      },
      "step3": {
        "title": "Hospital Affiliation",
        "completed": false,
        "data": {
          "hospital_affiliation": null,
          "practice_setting_other": null
        }
      },
      "step4": {
        "title": "NPI Verification",
        "completed": false,
        "data": {
          "npi_number": null,
          "board_certified": 0,
          "npi_verified_at": null
        }
      },
      "step5": {
        "title": "Identity Verification",
        "completed": false,
        "data": {
          "identity_status": "not_started",
          "identity_provider": "stripe_identity",
          "identity_session_id": null,
          "identity_verified_at": null
        }
      },
      "step6": {
        "title": "Compliance",
        "completed": false,
        "data": {
          "conflict_of_interest": null,
          "conflict_of_interest_details": null,
          "compliance_completed_at": null
        }
      }
    }
  }
}
```

---

### 12. Step 1: Basic Profile
```http
POST /api/physicians/onboarding/step1
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_country_code": "+1",
  "phone_number": "5551234567",
  "timezone": "America/New_York",
  "language": "en"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 1 completed: Basic profile updated",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "onboarding_step": 2
  }
}
```

---

### 13. Step 2: Professional Details
```http
POST /api/physicians/onboarding/step2
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "professional_title": "MD",
  "primary_specialty": "Cardiology",
  "career_start_year": 2015,
  "practice_setting": "hospital",
  "ai_annotation_experience": "moderate"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 2 completed: Professional details updated",
  "data": {
    "id": 1,
    "professional_title": "MD",
    "primary_specialty": "Cardiology",
    "onboarding_step": 3
  }
}
```

---

### 14. Step 3: Hospital Affiliation
```http
POST /api/physicians/onboarding/step3
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "hospital_affiliation": "City Hospital",
  "practice_setting_other": null
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 3 completed: Hospital affiliation updated",
  "data": {
    "id": 1,
    "hospital_affiliation": "City Hospital",
    "onboarding_step": 4
  }
}
```

---

### 15. Step 4: NPI Verification
```http
POST /api/physicians/onboarding/step4
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "npi_number": "1234567890",
  "board_certified": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 4 completed: NPI verification updated",
  "data": {
    "id": 1,
    "npi_number": "1234567890",
    "board_certified": 1,
    "npi_verified_at": "2026-10-29T10:00:00.000Z",
    "onboarding_step": 5
  }
}
```

---

### 16. Step 5: Identity Verification
```http
POST /api/physicians/onboarding/step5
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "identity_status": "verified",
  "identity_provider": "stripe_identity",
  "identity_session_id": "sess_1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 5 completed: Identity verification updated",
  "data": {
    "id": 1,
    "identity_status": "verified",
    "identity_provider": "stripe_identity",
    "identity_session_id": "sess_1234567890",
    "identity_verified_at": "2026-10-29T10:00:00.000Z",
    "onboarding_step": 6
  }
}
```

---

### 17. Step 6: Compliance
```http
POST /api/physicians/onboarding/step6
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "conflict_of_interest": false,
  "conflict_of_interest_details": null
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 6 completed: Onboarding finished",
  "data": {
    "id": 1,
    "conflict_of_interest": 0,
    "compliance_completed_at": "2026-10-29T10:00:00.000Z",
    "onboarding_step": 7,
    "onboarding_completed_at": "2026-10-29T10:00:00.000Z"
  }
}
```

---

### 18. Skip Step (Optional)
```http
POST /api/physicians/onboarding/skip/:stepNumber
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Step 3 skipped",
  "data": {
    "id": 1,
    "onboarding_step": 4
  }
}
```

---

### 19. Reset Onboarding (Testing)
```http
POST /api/physicians/onboarding/reset
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Onboarding reset to step 1",
  "data": {
    "id": 1,
    "onboarding_step": 1,
    "onboarding_completed_at": null
  }
}
```

---

## Admin Endpoints

### 11. Admin Login
```http
POST /api/admin/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminPassword"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here",
    "admin": {
      "id": 1,
      "userId": "ADM001",
      "user_name": "Admin",
      "user_mname": null,
      "user_lname": "User",
      "thumbnail": null,
      "user_email": "admin@example.com"
    }
  }
}
```

**Error - Invalid Credentials (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Error - Account Inactive (403 Forbidden):**
```json
{
  "success": false,
  "message": "Account is inactive"
}
```

---

### 20. Get Admin Profile
```http
GET /api/admin/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": "ADM001",
    "user_name": "Admin",
    "user_mname": null,
    "user_lname": "User",
    "thumbnail": null,
    "user_email": "admin@example.com",
    "insert_date": "2026-10-29T10:00:00.000Z",
    "last_login": "2026-10-29T11:00:00.000Z",
    "status": 1
  }
}
```

**Error - Not Found (404):**
```json
{
  "success": false,
  "message": "Admin not found"
}
```

---

### 21. Update Admin Profile
```http
PUT /api/admin/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "user_name": "Admin",
  "user_mname": null,
  "user_lname": "User",
  "thumbnail": "path/to/image.jpg"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "userId": "ADM001",
    "user_name": "Admin",
    "user_mname": null,
    "user_lname": "User",
    "thumbnail": "path/to/image.jpg",
    "user_email": "admin@example.com",
    "insert_date": "2026-10-29T10:00:00.000Z",
    "last_login": "2026-10-29T11:00:00.000Z",
    "status": 1
  }
}
```

---

## Developer Endpoints

### 22. Developer Login
```http
POST /api/developer/login
```

**Request Body:**
```json
{
  "email": "developer@example.com",
  "password": "devPassword"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "your_refresh_token_here",
    "developer": {
      "id": 1,
      "userId": "DEV001",
      "user_name": "Developer",
      "user_mname": null,
      "user_lname": "User",
      "thumbnail": null,
      "user_email": "developer@example.com"
    }
  }
}
```

**Error - Invalid Credentials (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Error - Account Inactive (403 Forbidden):**
```json
{
  "success": false,
  "message": "Account is inactive"
}
```

---

### 23. Get Developer Profile
```http
GET /api/developer/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": "DEV001",
    "user_name": "Developer",
    "user_mname": null,
    "user_lname": "User",
    "thumbnail": null,
    "user_email": "developer@example.com",
    "insert_date": "2026-10-29T10:00:00.000Z",
    "last_login": "2026-10-29T11:00:00.000Z",
    "status": 1
  }
}
```

**Error - Not Found (404):**
```json
{
  "success": false,
  "message": "Developer not found"
}
```

---

### 24. Update Developer Profile
```http
PUT /api/developer/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "user_name": "Developer",
  "user_mname": null,
  "user_lname": "User",
  "thumbnail": "path/to/image.jpg"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "userId": "DEV001",
    "user_name": "Developer",
    "user_mname": null,
    "user_lname": "User",
    "thumbnail": "path/to/image.jpg",
    "user_email": "developer@example.com",
    "insert_date": "2026-10-29T10:00:00.000Z",
    "last_login": "2026-10-29T11:00:00.000Z",
    "status": 1
  }
}
```

---

## Error Responses

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, number, and special character"
    }
  ]
}
```

### Unauthorized (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Forbidden (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

### Not Found (404 Not Found)
```json
{
  "success": false,
  "message": "Route not found"
}
```

### Server Error (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Token Management Flow

### Registration/Login Flow
1. User registers/logs in → receives `accessToken` (15min) + `refreshToken` (30 days)
2. Use `accessToken` for API calls
3. When `accessToken` expires (after 15min), call `/api/auth/refresh` with `refreshToken`
4. Get new `accessToken` and continue

### 2FA Flow
1. Login → if 2FA enabled, returns `tempToken` (5min) + `requiresTwoFactor: true`
2. Call `/api/physicians/auth/2fa/verify` with `tempToken` + `two_factor_code`
3. Receive final `accessToken` + `refreshToken`

### Logout Flow
1. Call `/api/auth/logout` with `accessToken` and `refreshToken`
2. All tokens are revoked from database

---

## Two-Factor Authentication Setup

### Step 1: Setup
```http
POST /api/physicians/auth/2fa/setup
Authorization: Bearer <access_token>
```
Response includes QR code and secret.

### Step 2: Scan & Verify
1. Scan QR code with Google Authenticator
2. Call `/api/physicians/auth/2fa/confirm` with secret and code from app
3. Save recovery codes securely

---

## Security Features

### Rate Limiting
- 100 requests per 15 minutes per IP
- Health check endpoint is exempt

### Account Lockout
- 5 failed login attempts = 30 minute lock
- Lock resets after successful login

### Password Security
- Bcrypt hashing with 10 salt rounds
- Strong password requirements enforced

### JWT Tokens
- Access Token: 15 minutes expiry
- Refresh Token: 30 days expiry
- HS256 signing algorithm
- Tokens stored in database for revocation

### 2FA
- TOTP-based (Time-based One-Time Password)
- Google Authenticator compatible
- 10 recovery codes provided
- 2-step tolerance for time sync

### User Type Protection
- Middleware checks `userType` in token
- Physician endpoints only allow `physician` userType
- Admin endpoints only allow `admin` userType
- Developer endpoints only allow `developer` userType

---

## Folder Structure (Microservices)

```
clinixium-api/
├── config/
│   └── database.js              # MySQL connection
├── middleware/
│   ├── authMiddleware.js        # JWT verification with userType check
│   ├── errorHandler.js          # Global error handler
│   ├── rateLimiter.js           # Rate limiting
│   └── securityMiddleware.js     # Security headers & CORS
├── services/
│   ├── auth/                    # Generic Auth Service
│   │   ├── controllers/
│   │   │   └── authController.js    # Refresh token, logout
│   │   └── routes/
│   │       └── authRoutes.js        # Generic auth endpoints
│   ├── physicians/              # Physician Service
│   │   ├── controllers/
│   │   │   ├── physicianAuthController.js  # Register, login, 2FA
│   │   │   └── physicianController.js      # Profile management
│   │   ├── models/
│   │   │   └── Physician.js
│   │   └── routes/
│   │       ├── physicianAuthRoutes.js      # Auth endpoints
│   │       └── physicianRoutes.js           # Profile endpoints
│   ├── admin/                   # Admin Service
│   │   ├── controllers/
│   │   │   └── adminAuthController.js       # Login, profile
│   │   ├── models/
│   │   │   └── Admin.js
│   │   └── routes/
│   │       └── adminRoutes.js               # Admin endpoints
│   ├── developer/               # Developer Service
│   │   ├── controllers/
│   │   │   └── developerAuthController.js   # Login, profile
│   │   ├── models/
│   │   │   └── Developer.js
│   │   └── routes/
│   │       └── developerRoutes.js           # Developer endpoints
│   ├── authService.js           # Auth utilities
│   ├── twoFactorService.js      # 2FA logic
│   └── refreshTokenService.js   # Refresh token management
├── utils/
│   └── validators.js            # Joi validation schemas
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── server.js                    # Main server
├── refresh_tokens.sql           # Refresh tokens table schema
├── README.md
└── API_DOCUMENTATION.md
```

---

## Database Setup

### 1. Import Physicians Table
```bash
mysql -u root -p clinixium-myapi < clinixium-myapi.sql
```

### 2. Import Refresh Tokens Table
```bash
mysql -u root -p clinixium-myapi < refresh_tokens.sql
```

---

## Testing with cURL

### Register Physician
```bash
curl -X POST http://localhost:3000/api/physicians/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login Physician
```bash
curl -X POST http://localhost:3000/api/physicians/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:3000/api/physicians/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Setup 2FA
```bash
curl -X POST http://localhost:3000/api/physicians/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Verify 2FA
```bash
curl -X POST http://localhost:3000/api/physicians/auth/2fa/verify \
  -H "Authorization: Bearer TEMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "two_factor_code": "123456"
  }'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminPassword"
  }'
```

### Developer Login
```bash
curl -X POST http://localhost:3000/api/developer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "devPassword"
  }'
```

---

## Available Services

### Physician Service
- Full authentication (register, login, 2FA)
- Profile management
- Located at `services/physicians/`

### Admin Service
- Login only (no registration - admins created manually)
- Profile management
- Located at `services/admin/`

### Developer Service
- Login only (no registration - developers created manually)
- Profile management
- Located at `services/developer/`

All services share:
- Generic `/api/auth/refresh` endpoint
- Generic `/api/auth/logout` endpoint
- User type protection via middleware
