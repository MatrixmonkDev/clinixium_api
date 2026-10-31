# Clinixium API

Node.js Express API for Physician Management with Security Guardrails and 2FA

## Features

- ✅ Physician Registration & Login
- ✅ Access Token + Refresh Token System
- ✅ Two-Factor Authentication (Google Authenticator)
- ✅ Profile Management
- ✅ Security Middleware (Helmet, CORS, Rate Limiting)
- ✅ Input Validation (Joi)
- ✅ Password Hashing (Bcrypt)
- ✅ Account Lockout Protection
- ✅ ES6 Modules (import/export)
- ✅ Microservices Architecture
- ✅ User Type Protection (Physician/Admin/Developer)

## Folder Structure (Microservices Architecture)

```
clinixium-api/
├── config/
│   └── database.js              # MySQL connection pool
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
│   ├── authService.js           # Auth utilities
│   ├── twoFactorService.js      # 2FA logic
│   └── refreshTokenService.js   # Refresh token management
├── utils/
│   └── validators.js            # Joi validation schemas
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── server.js                    # Main server file
├── refresh_tokens.sql           # Refresh tokens table schema
├── README.md
└── API_DOCUMENTATION.md
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- Git

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE `clinixium-myapi`;
```

2. Import the tables:
```bash
mysql -u root -p clinixium-myapi < clinixium-myapi.sql
mysql -u root -p clinixium-myapi < refresh_tokens.sql
mysql -u root -p clinixium-myapi < admin_mst.sql
mysql -u root -p clinixium-myapi < developer_mst.sql
```

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=clinixium-myapi
DB_PORT=3306

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

TWO_FACTOR_ISSUER=Clinixium

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - API info

### Generic Auth (All Users)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (revoke tokens)

### Physician Authentication
- `POST /api/physicians/auth/register` - Register new physician
- `POST /api/physicians/auth/login` - Login
- `POST /api/physicians/auth/2fa/verify` - Verify 2FA after login
- `POST /api/physicians/auth/2fa/setup` - Setup 2FA
- `POST /api/physicians/auth/2fa/confirm` - Confirm 2FA
- `POST /api/physicians/auth/2fa/disable` - Disable 2FA

### Physician Profile
- `GET /api/physicians/profile` - Get profile (physicians only)
- `PUT /api/physicians/profile` - Update profile (physicians only)

### Physician Onboarding
- `GET /api/physicians/onboarding/progress` - Get onboarding progress
- `POST /api/physicians/onboarding/step1` - Step 1: Basic Profile
- `POST /api/physicians/onboarding/step2` - Step 2: Professional Details
- `POST /api/physicians/onboarding/step3` - Step 3: Hospital Affiliation
- `POST /api/physicians/onboarding/step4` - Step 4: NPI Verification
- `POST /api/physicians/onboarding/step5` - Step 5: Identity Verification
- `POST /api/physicians/onboarding/step6` - Step 6: Compliance
- `POST /api/physicians/onboarding/skip/:stepNumber` - Skip a step (optional)
- `POST /api/physicians/onboarding/reset` - Reset onboarding (testing)

### Admin Authentication
- `POST /api/admin/login` - Login

### Admin Profile
- `GET /api/admin/profile` - Get profile (admin only)
- `PUT /api/admin/profile` - Update profile (admin only)

### Developer Authentication
- `POST /api/developer/login` - Login

### Developer Profile
- `GET /api/developer/profile` - Get profile (developer only)
- `PUT /api/developer/profile` - Update profile (developer only)

**Note:** Access token expires in 15 minutes. Use refresh token to get new access token via `/api/auth/refresh`.

## Physician Onboarding Flow

Physician onboarding consists of 6 steps that must be completed after registration:

1. **Step 1: Basic Profile** - Personal information (name, phone, timezone, language)
2. **Step 2: Professional Details** - Title, specialty, career start, practice setting
3. **Step 3: Hospital Affiliation** - Hospital/clinic information
4. **Step 4: NPI Verification** - NPI number and board certification
5. **Step 5: Identity Verification** - Identity verification status (Stripe Identity)
6. **Step 6: Compliance** - Conflict of interest declaration

Each step must be completed in order. Progress is tracked in the database via `onboarding_step` field (1-7, where 7 = completed). Use `/api/physicians/onboarding/progress` to check current status.

## Security Features

### Guardrails
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options)
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Joi schema validation
- **Password Hashing**: Bcrypt with salt rounds
- **JWT Authentication**: Access token (15min) + Refresh token (30 days)
- **Token Revocation**: Database-stored tokens for secure logout
- **Account Lockout**: 5 failed attempts = 30 min lock
- **2FA**: Google Authenticator with QR codes
- **User Type Protection**: Middleware checks user type (physician/admin/developer)

### Best Practices
- Environment variables for secrets
- No sensitive data in logs
- Error messages don't leak info
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- Refresh tokens stored in database for revocation

## Testing

### Test with Postman or cURL

Register Physician:
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

Login Physician:
```bash
curl -X POST http://localhost:3000/api/physicians/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123!"
  }'
```

Refresh Token:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

Get Profile:
```bash
curl -X GET http://localhost:3000/api/physicians/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Admin Login:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminPassword"
  }'
```

Developer Login:
```bash
curl -X POST http://localhost:3000/api/developer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "devPassword"
  }'
```

**Note:** Admin and Developer accounts are created manually in the database. No registration API is provided for them.

## Troubleshooting

### Database Connection Error
- Check MySQL is running
- Verify DB credentials in `.env`
- Ensure database exists

### JWT Errors
- Check JWT_SECRET in `.env`
- Ensure token is not expired

### 2FA Not Working
- Ensure Google Authenticator app time is synced
- Check system time matches authenticator

## License

ISC

## Detailed API Documentation

For complete API documentation with all endpoints, request/response examples, and error handling, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
