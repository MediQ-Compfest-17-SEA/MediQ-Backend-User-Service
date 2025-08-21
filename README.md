# MediQ User Service v3.0

Mikroservice untuk manajemen pengguna (user management) dalam sistem MediQ. Service ini menangani autentikasi, registrasi, dan pengelolaan data pengguna termasuk data KTP lengkap dengan integrasi Gemini AI OCR Engine dan sistem notifikasi real-time.

## 🚀 Features

- **🔐 Enhanced JWT Authentication** - Access dan refresh tokens dengan rate limiting
- **🛡️ Advanced Role-based Access Control** - PASIEN, OPERATOR, ADMIN_FASKES dengan fine-grained permissions
- **📄 Complete KTP Field Support** - 17+ field lengkap dari hasil OCR dengan validasi komprehensif
- **🤖 Gemini AI OCR Integration** - Otomatis registrasi dari OCR Engine dengan akurasi tinggi
- **📱 Real-time Notifications** - WebSocket dan push notifications untuk status updates
- **✅ Advanced Data Validation** - Multi-layer validation untuk NIK, email, dan data KTP
- **🔄 Enhanced Microservice Integration** - RabbitMQ dengan retry logic dan circuit breaker
- **📊 Complete Profile Management** - Full CRUD operations dengan audit trail
- **🔔 Notification Center** - In-app notifications dan external integrations

## 📊 Database Schema

### User Model (Enhanced v3.0)
```sql
model User {
  id                 String    @id @default(uuid())
  nik                String    @unique          -- Nomor Induk Kependudukan
  name               String                     -- Nama lengkap
  email              String?   @unique          -- Email (optional untuk OCR users)
  password           String?                    -- BCrypt hashed password (optional)
  role               Role      @default(PASIEN) -- User role
  isActive           Boolean   @default(true)   -- Account status
  isEmailVerified    Boolean   @default(false)  -- Email verification status
  phoneNumber        String?   @unique          -- Phone number with WhatsApp integration
  
  -- Complete KTP Data Fields (Enhanced dari Gemini AI OCR)
  tempat_lahir       String?   -- Tempat lahir
  tgl_lahir          String?   -- Tanggal lahir (DD-MM-YYYY)
  jenis_kelamin      String?   -- LAKI-LAKI/PEREMPUAN
  alamat_jalan       String?   -- Alamat jalan lengkap
  alamat_kel_desa    String?   -- Kelurahan/Desa
  alamat_kecamatan   String?   -- Kecamatan
  alamat_rt_rw       String?   -- RT/RW
  alamat_kota        String?   -- Kota/Kabupaten
  alamat_provinsi    String?   -- Provinsi
  alamat_kode_pos    String?   -- Kode pos
  agama              String?   -- Agama
  status_perkawinan  String?   -- Status perkawinan
  pekerjaan          String?   -- Pekerjaan
  kewarganegaraan    String?   -- WNI/WNA
  berlaku_hingga     String?   -- Masa berlaku KTP
  golongan_darah     String?   -- Golongan darah (A/B/AB/O)
  
  -- Authentication & Security
  hashedRefreshToken String?   -- Refresh token (hashed)
  lastLoginAt        DateTime? -- Last login timestamp
  loginAttempts      Int       @default(0) -- Failed login attempts
  blockedUntil       DateTime? -- Account block expiry
  
  -- Notification Preferences
  enableEmailNotif   Boolean   @default(true)   -- Email notifications
  enablePushNotif    Boolean   @default(true)   -- Push notifications
  enableWhatsAppNotif Boolean  @default(false)  -- WhatsApp notifications
  
  -- Audit Trail
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  createdBy          String?   -- Created by user ID
  updatedBy          String?   -- Last updated by user ID
  
  // Relations
  notifications      UserNotification[]
  sessions          UserSession[]
}

enum Role {
  PASIEN        -- Pasien/User biasa
  OPERATOR      -- Operator faskes
  ADMIN_FASKES  -- Admin fasilitas kesehatan
  SUPER_ADMIN   -- Super admin untuk sistem management
}

model UserNotification {
  id          String    @id @default(uuid())
  userId      String
  title       String
  message     String
  type        NotificationType
  isRead      Boolean   @default(false)
  metadata    Json?     -- Additional notification data
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  REGISTRATION_SUCCESS
  QUEUE_UPDATE
  APPOINTMENT_REMINDER
  SYSTEM_NOTIFICATION
  OCR_PROCESSING_COMPLETE
  ACCOUNT_SECURITY
}

model UserSession {
  id              String    @id @default(uuid())
  userId          String
  sessionToken    String    @unique
  refreshToken    String    @unique
  ipAddress       String?
  userAgent       String?
  isActive        Boolean   @default(true)
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
```

## 🔌 API Endpoints

### 🔐 Authentication
- `POST /auth/register` - Register user dengan email/password
- `POST /auth/login` - Login dengan email/password atau NIK/password
- `POST /auth/login/admin` - Admin login dengan enhanced security
- `POST /auth/login/ocr` - Login khusus untuk OCR-created users
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user (invalidate tokens)
- `POST /auth/logout-all` - Logout dari semua devices
- `POST /auth/forgot-password` - Reset password request
- `POST /auth/reset-password` - Reset password dengan token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend email verification

### 👤 User Management
- `POST /users` - Create user (dengan complete KTP data)
- `POST /users/bulk-create` - Bulk create users (Admin only)
- `GET /users` - Get all users dengan filtering dan pagination (Admin only)
- `GET /users/search` - Advanced user search (Admin/Operator)
- `GET /users/profile` - Get current user profile
- `GET /users/profile/complete` - Get complete profile dengan KTP data
- `PUT /users/profile` - Update current user profile
- `PATCH /users/:id` - Partial update user (Admin only)
- `PATCH /users/:id/role` - Update user role (Admin only)
- `PATCH /users/:id/status` - Activate/deactivate user (Admin only)
- `DELETE /users/:id` - Delete user (Admin only)
- `GET /users/check-nik/:nik` - Check NIK registration status
- `GET /users/check-email/:email` - Check email availability
- `GET /users/stats` - Get user statistics (Admin only)

### 🔔 Notifications
- `GET /users/notifications` - Get user notifications
- `POST /users/notifications/:id/read` - Mark notification as read
- `POST /users/notifications/read-all` - Mark all notifications as read
- `DELETE /users/notifications/:id` - Delete notification
- `GET /users/notifications/unread-count` - Get unread notifications count
- `PATCH /users/notification-settings` - Update notification preferences

### 👥 Session Management
- `GET /users/sessions` - Get active sessions
- `DELETE /users/sessions/:sessionId` - Terminate specific session
- `DELETE /users/sessions/others` - Terminate all other sessions

## 📨 Message Patterns (RabbitMQ)

Service ini mendengarkan pesan dari queue `user_service_queue` dengan enhanced message handling:

### 📥 Incoming Messages
```typescript
// Create user dari Gemini AI OCR Engine
'user.create' -> CreateUserDto (dengan complete KTP data dari AI)

// Bulk create users
'user.bulk-create' -> CreateUserDto[] (batch processing)

// Check NIK exists dengan enhanced validation
'user.check-nik-exists' -> { nik: string, includeInactive?: boolean }

// Get user by NIK dengan complete data
'user.get-by-nik' -> { nik: string, includeKtp?: boolean }

// Get user by ID
'user.get-by-id' -> { id: string, includeNotifications?: boolean }

// Send notification to user
'user.send-notification' -> { 
  userId: string, 
  title: string, 
  message: string, 
  type: NotificationType,
  metadata?: any 
}

// Update notification preferences
'user.update-notification-settings' -> { 
  userId: string, 
  settings: NotificationSettings 
}

// Health check dengan detailed status
'user.health' -> { includeStats?: boolean }

// OCR processing complete notification
'user.ocr-complete' -> { 
  userId: string, 
  ocrResultId: string, 
  status: 'success' | 'failed' 
}
```

### 📤 Response Format
```typescript
// Enhanced user creation response
{
  id: string,
  nik: string,
  name: string,
  email?: string,
  phoneNumber?: string,
  role: Role,
  isActive: boolean,
  // Complete KTP fields (17+ fields)
  tempat_lahir?: string,
  tgl_lahir?: string,
  jenis_kelamin?: string,
  alamat_jalan?: string,
  alamat_kel_desa?: string,
  alamat_kecamatan?: string,
  alamat_rt_rw?: string,
  alamat_kota?: string,
  alamat_provinsi?: string,
  alamat_kode_pos?: string,
  agama?: string,
  status_perkawinan?: string,
  pekerjaan?: string,
  kewarganegaraan?: string,
  berlaku_hingga?: string,
  golongan_darah?: string,
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy?: string,
  notificationSettings: NotificationSettings
}

// Enhanced NIK check response
{
  exists: boolean,
  isActive?: boolean,
  userId?: string,
  registrationDate?: Date
}

// Enhanced health response
{
  status: 'ok' | 'degraded' | 'down',
  service: 'user-service',
  version: '3.0',
  timestamp: Date,
  stats?: {
    totalUsers: number,
    activeUsers: number,
    newUsersToday: number,
    ocrUsers: number
  },
  dependencies: {
    database: 'connected' | 'disconnected',
    rabbitmq: 'connected' | 'disconnected',
    redis: 'connected' | 'disconnected'
  }
}

// Notification response
{
  id: string,
  success: boolean,
  deliveryChannels: ('email' | 'push' | 'whatsapp')[],
  timestamp: Date
}
```

## 🔧 Environment Variables

```env
# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/mediq_users"

# JWT & Authentication
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"
PASSWORD_RESET_TOKEN_EXPIRY="1h"
EMAIL_VERIFICATION_TOKEN_EXPIRY="24h"

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION="30m"
RATE_LIMIT_WINDOW="15m"
RATE_LIMIT_MAX_REQUESTS=100

# Messaging & Queue
RABBITMQ_URL="amqp://localhost:5672"
RABBITMQ_EXCHANGE="mediq.exchange"
RABBITMQ_QUEUE="user_service_queue"
RABBITMQ_RETRY_ATTEMPTS=3
RABBITMQ_RETRY_DELAY=5000

# Redis Configuration (for caching & sessions)
REDIS_URL="redis://localhost:6379"
REDIS_SESSION_PREFIX="mediq:session:"
REDIS_CACHE_TTL=3600

# Notification Services
EMAIL_PROVIDER="smtp" # or "sendgrid", "mailgun"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_NAME="MediQ System"
SMTP_FROM_EMAIL="noreply@mediq.com"

# Push Notifications
FCM_SERVER_KEY="your-firebase-server-key"
FCM_PROJECT_ID="your-firebase-project-id"

# WhatsApp Integration (via WhatsApp Business API)
WHATSAPP_API_URL="https://graph.facebook.com/v17.0"
WHATSAPP_ACCESS_TOKEN="your-whatsapp-access-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"

# External Integrations
OCR_ENGINE_URL="http://localhost:8604"
GEMINI_AI_API_KEY="your-gemini-api-key"
API_GATEWAY_URL="http://localhost:8601"

# Application Settings
NODE_ENV="development" # or "production", "staging"
PORT=8602
LOG_LEVEL="debug"
ENABLE_SWAGGER=true
CORS_ORIGINS="http://localhost:3000,https://mediq.craftthingy.com"

# Monitoring & Health Check
HEALTH_CHECK_INTERVAL=30000
ENABLE_METRICS=true
SENTRY_DSN="your-sentry-dsn" # Optional for error tracking
```

## 🏃‍♂️ Development

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:e2e
```

## 📝 Swagger Documentation

API documentation tersedia di: `http://localhost:8602/api/docs`

## 🔄 Integration dengan Services Lain

### 🤖 Gemini AI OCR Engine Integration (NEW v3.0)
- **Enhanced AI Processing** - Menerima data KTP dengan akurasi tinggi dari Gemini AI
- **17+ Complete KTP Fields** - Semua field KTP terextract secara otomatis
- **Real-time Processing** - Instant user creation dengan data lengkap
- **AI Confidence Scoring** - Validasi data berdasarkan confidence score AI
- **Automatic Data Enhancement** - AI melakukan data cleansing dan formatting
- **Batch Processing Support** - Dapat memproses multiple KTP sekaligus

### 🚪 Enhanced API Gateway Integration
- **Advanced Circuit Breaker** - Fault tolerance dengan multiple strategies
- **Intelligent Rate Limiting** - Per-user dan per-endpoint rate limits
- **JWT Enhancement** - Multi-level token validation dengan session tracking
- **Request/Response Logging** - Comprehensive audit trail
- **Load Balancing** - Auto scaling berdasarkan traffic patterns

### 📋 Queue Service Integration
- **Smart Queue Assignment** - AI-powered queue optimization
- **Real-time Updates** - Live queue status updates via WebSocket
- **Priority Queue Support** - VIP dan emergency patient handling
- **Multi-institution Support** - Cross-institutional queue management
- **Notification Integration** - Automated queue status notifications

### 📱 Real-time Notification System (NEW v3.0)
- **Multi-channel Delivery** - Email, Push, WhatsApp, In-app
- **Notification Templates** - Dynamic content dengan personalization
- **Delivery Tracking** - Read receipts dan delivery confirmations
- **Preference Management** - User-controlled notification settings
- **Smart Routing** - Optimal delivery channel selection

### 🏥 Institution Service Integration
- **Cross-institutional User Management** - Single user, multiple institutions
- **Role-based Institution Access** - Fine-grained permissions per institution
- **Institution-specific Settings** - Customizable workflows per institution

## 🏥 Enhanced Registration Flows

### 🤖 AI-Powered OCR Registration (v3.0)
1. **KTP Capture** - High-quality image capture dengan guidelines
2. **Gemini AI Processing** - Advanced OCR dengan confidence scoring
3. **Real-time Validation** - Instant data verification dan formatting
4. **Smart User Creation** - Auto-complete profile dengan AI enhancements
5. **Notification Dispatch** - Multi-channel registration confirmations
6. **Queue Auto-enrollment** - Smart queue assignment berdasarkan location
7. **Real-time Updates** - Live status updates untuk user dan admin

### 📧 Traditional Email Registration
1. **Form Submission** - Web/mobile registration form
2. **Email Verification** - Secure email confirmation process
3. **Profile Completion** - Step-by-step profile building
4. **Manual Validation** - Admin review untuk sensitive data
5. **Account Activation** - Final approval dan welcome notifications

## 🛡️ Enhanced Security Features (v3.0)

### 🔐 Multi-layered Authentication
- **Adaptive Password Hashing** - BCrypt dengan dynamic salt rounds (10-15)
- **Enhanced JWT Strategy** - Access (15 min), Refresh (7 days), Session tracking
- **Multi-factor Authentication** - SMS, Email, TOTP support
- **Device Fingerprinting** - Suspicious login detection
- **IP Whitelisting** - Admin-configurable IP restrictions

### 🔒 Advanced Authorization
- **Fine-grained RBAC** - Resource-level permissions
- **Context-aware Permissions** - Location dan time-based access
- **Dynamic Role Assignment** - Auto-role management berdasarkan context
- **API Rate Limiting** - Per-user, per-endpoint, dan per-resource limits

### 🛟 Account Protection
- **Intelligent Brute Force Protection** - Progressive delays dengan ML detection
- **Account Lockout Management** - Temporary lockout dengan admin override
- **Password Policy Enforcement** - Complexity requirements dengan scoring
- **Session Management** - Concurrent session limits dan force logout

### 📊 Security Monitoring
- **Real-time Threat Detection** - Automated suspicious activity alerts
- **Audit Trail** - Complete user action logging dengan immutable logs
- **Compliance Reporting** - GDPR, HIPAA compliance reports
- **Security Metrics** - Dashboard dengan security KPIs

## 📊 Enhanced Monitoring & Health (v3.0)

### 🔍 Health Check Endpoints
- `GET /health` - Basic service health status
- `GET /health/detailed` - Comprehensive health dengan dependency status
- `GET /health/metrics` - Performance metrics dan statistics
- `GET /health/dependencies` - External service connectivity status

### 📈 Real-time Metrics
- **Performance Metrics** - Response times, throughput, error rates
- **Business Metrics** - User registrations, login rates, OCR success rates
- **System Metrics** - Memory usage, CPU usage, database connections
- **Security Metrics** - Failed logins, blocked IPs, suspicious activities

### 🔔 Alerting & Notifications
- **Threshold-based Alerts** - Custom thresholds untuk critical metrics
- **Anomaly Detection** - ML-powered anomaly detection
- **Multi-channel Alerting** - Slack, Email, PagerDuty integrations
- **Escalation Policies** - Auto escalation untuk critical incidents

### 📊 Dashboard Integration
- **Grafana Dashboard** - Real-time monitoring dashboard
- **Prometheus Metrics** - Time-series metrics collection
- **Log Aggregation** - Centralized logging dengan ELK stack
- **Tracing Integration** - Distributed tracing dengan Jaeger

## 🚀 Performance & Scalability (v3.0)

### ⚡ Performance Optimizations
- **Database Indexing** - Optimized indexes untuk NIK dan email lookups
- **Connection Pooling** - Database connection pooling dengan retry logic
- **Caching Strategy** - Redis caching untuk frequent queries
- **Query Optimization** - Optimized Prisma queries dengan select fields

### 📈 Scalability Features
- **Horizontal Scaling** - Multi-instance deployment support
- **Load Balancing** - Round-robin dan least connections algorithms
- **Auto Scaling** - Kubernetes HPA berdasarkan CPU/memory usage
- **Database Sharding** - Future-ready sharding strategy

## 🔧 Development & Testing (Enhanced)

```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env dengan configuration yang sesuai

# Database operations
npx prisma migrate dev       # Run database migrations
npx prisma generate         # Generate Prisma client
npx prisma db seed         # Seed database dengan test data
npx prisma studio         # Open Prisma Studio

# Development
npm run start:dev          # Start development server dengan hot reload
npm run start:debug       # Start dengan debug mode
npm run start:prod        # Start production server

# Building
npm run build             # Build untuk production
npm run build:watch      # Build dengan watch mode

# Testing (100% Coverage Required)
npm run test              # Run unit tests
npm run test:watch       # Run tests dalam watch mode
npm run test:cov         # Run tests dengan coverage report
npm run test:e2e         # Run end-to-end tests
npm run test:integration # Run integration tests
npm run test:load       # Run load tests dengan Artillery

# Code Quality
npm run lint             # ESLint dengan auto-fix
npm run lint:fix        # Fix linting issues
npm run format          # Prettier formatting
npm run type-check      # TypeScript type checking

# Security & Compliance
npm run audit           # Security vulnerability scanning
npm run audit:fix      # Fix security vulnerabilities
npm run compliance     # GDPR/HIPAA compliance check
```

## 📚 Enhanced Swagger Documentation (v3.0)

- **Interactive API Docs** - `http://localhost:8602/api/docs`
- **OpenAPI 3.0 Specification** - Complete API specification
- **Authentication Testing** - Built-in JWT token testing
- **Request/Response Examples** - Comprehensive examples untuk semua endpoints
- **Error Code Documentation** - Detailed error codes dan troubleshooting
- **Rate Limiting Info** - Rate limit documentation per endpoint
- **Versioning Support** - API versioning documentation

### 📖 Additional Documentation
- **Postman Collection** - `http://localhost:8602/api/docs/postman.json`
- **OpenAPI JSON** - `http://localhost:8602/api/docs/json`
- **API Changelog** - `http://localhost:8602/api/docs/changelog`

---

## 📋 Service Information

**Version:** 3.0  
**Port:** 8602  
**Public URL:** https://mediq-user-service.craftthingy.com  
**Database:** MySQL - mediq_users (dengan Redis caching)  
**Queue:** user_service_queue (RabbitMQ)  
**Real-time:** WebSocket support untuk notifications  
**Monitoring:** Prometheus metrics pada `/metrics`  
**Health Check:** `/health` dan `/health/detailed`  

### 🔗 Related Services
- **API Gateway:** https://mediq-api-gateway.craftthingy.com
- **OCR Engine:** https://mediq-ocr-engine.craftthingy.com  
- **Queue Service:** https://mediq-queue-service.craftthingy.com
- **Institution Service:** https://mediq-institution-service.craftthingy.com

### 📱 Client Applications
- **Web Dashboard:** https://mediq-admin.craftthingy.com
- **Patient Portal:** https://mediq.craftthingy.com
- **Mobile API:** Same endpoints dengan responsive design
