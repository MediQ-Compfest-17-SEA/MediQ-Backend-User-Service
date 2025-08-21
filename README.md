# MediQ Backend - User Service

## 👤 Deskripsi

**User Service** adalah layanan inti dalam sistem MediQ yang mengelola **manajemen pengguna dan autentikasi** untuk seluruh platform. Service ini menyediakan sistem autentikasi yang aman dengan JWT tokens, role-based access control, dan integrasi seamless dengan semua microservices lainnya.

## ✨ Fitur Utama

### 🔐 Sistem Autentikasi Lengkap
- **Dual Login System**: Login admin (email/password) dan login pasien (NIK/nama)
- **JWT Token Management**: Access tokens (15 menit) + refresh tokens (7 hari)
- **Password Security**: BCrypt hashing dengan salt rounds optimal
- **Session Management**: Secure session handling dengan refresh token rotation

### 👥 Manajemen Pengguna
- **Role-Based Access Control**: PASIEN, OPERATOR, ADMIN_FASKES
- **User Registration**: Pendaftaran pengguna baru dengan validasi email dan NIK
- **Profile Management**: Update profil dan role management
- **NIK Validation**: Validasi NIK Indonesia dengan format checking

### 🔄 Microservices Integration
- **RabbitMQ Patterns**: Komunikasi dengan OCR Service untuk auto-registration
- **Database Independence**: MySQL database terpisah untuk user data
- **Event-Driven**: Message patterns untuk cross-service communication

## 🚀 Quick Start

### Persyaratan
- **Node.js** 18+
- **MySQL** 8.0+
- **RabbitMQ** 3.9+
- **Redis** (optional, untuk session caching)

### Instalasi

```bash
# Clone repository
git clone https://github.com/MediQ-Compfest-17-SEA/MediQ-Backend-User-Service.git
cd MediQ-Backend-User-Service

# Install dependencies
npm install

# Setup database
npx prisma migrate dev
npx prisma generate

# Setup environment variables
cp .env.example .env
# Edit .env sesuai konfigurasi environment Anda

# Start development server
npm run start:dev
```

### Environment Variables

```env
# Server Configuration
PORT=8602
NODE_ENV=development

# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/mediq_users"

# JWT Configuration  
JWT_SECRET=your-very-secure-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-256-bits-minimum
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672

# Security
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=6

# Logging
LOG_LEVEL=info
```

## 📋 API Endpoints

### Base URL
**Development**: `http://localhost:8602`  
**Production**: `https://api.mediq.com/users`

### Swagger Documentation
**Interactive API Docs**: `http://localhost:8602/api/docs`

### Authentication Endpoints

#### 🔑 Login & Authentication

**Login Admin/Operator**
```http
POST /auth/login/admin
Content-Type: application/json

{
  "email": "admin@mediq.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "name": "Admin User",
    "email": "admin@mediq.com", 
    "role": "ADMIN_FASKES"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Login Pasien (NIK + Nama)**
```http
POST /auth/login/user  
Content-Type: application/json

{
  "nik": "3171012345678901",
  "name": "John Doe"
}
```

**Refresh Token**
```http
GET /auth/refresh
Authorization: Bearer [refresh-token]
```

**Logout**
```http
GET /auth/logout
Authorization: Bearer [access-token]
```

#### 👤 User Management

**Register User Baru**
```http
POST /users
Content-Type: application/json

{
  "nik": "3171012345678901",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Check NIK Registration**
```http
GET /users/check-nik/3171012345678901
```

**Get User Profile**
```http
GET /users/profile
Authorization: Bearer [access-token]
```

**Get All Users (Admin Only)**
```http
GET /users
Authorization: Bearer [admin-access-token]
```

**Update User Role (Admin Only)**
```http
PATCH /users/{userId}/role
Authorization: Bearer [admin-access-token]
Content-Type: application/json

{
  "role": "OPERATOR"
}
```

## 🧪 Testing

### Unit Testing
```bash
# Run all tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Test specific service
npm run test user.service.spec.ts
npm run test auth.service.spec.ts
```

### Integration Testing
```bash
# Test database operations
npm run test:integration

# Test RabbitMQ communication  
npm run test:messaging

# Test authentication flows
npm run test:auth-flow
```

### Security Testing
```bash
# Test JWT validation
npm run test:jwt

# Test role-based access
npm run test:rbac

# Test password security
npm run test:password-security
```

## 🏗️ Database Schema

### User Model
```sql
model User {
  id                 String    @id @default(uuid())
  nik                String    @unique           // Nomor Induk Kependudukan
  name               String                      // Nama lengkap
  email              String    @unique           // Email unik
  password           String                      // BCrypt hashed password
  hashedRefreshToken String?                     // Refresh token (hashed)
  role               Role      @default(PASIEN)  // User role
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

enum Role {
  PASIEN        // Regular patient
  OPERATOR      // Healthcare operator  
  ADMIN_FASKES  // Healthcare facility admin
}
```

### Database Operations
```typescript
// User creation dengan validation
async create(createUserDto: CreateUserDto) {
  // 1. Check existing email/NIK
  const existingUser = await this.prisma.user.findFirst({
    where: { OR: [{ email }, { nik }] },
  });
  
  if (existingUser) {
    throw new ConflictException('Email or NIK is already registered');
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // 3. Create user
  return this.prisma.user.create({
    data: { name, email, nik, password: hashedPassword },
    select: { id: true, nik: true, name: true, email: true, role: true }
  });
}
```

## 📦 Production Deployment

### Docker
```bash
# Build production image
docker build -t mediq/user-service:latest .

# Run container
docker run -p 8602:8602 \
  -e DATABASE_URL="mysql://user:pass@mysql:3306/mediq_users" \
  -e JWT_SECRET="your-production-jwt-secret" \
  -e RABBITMQ_URL="amqp://rabbitmq:5672" \
  mediq/user-service:latest
```

### Kubernetes
```bash
# Deploy dengan database migrations
kubectl apply -f k8s/

# Run database migrations
kubectl exec -it user-service-pod -- npx prisma migrate deploy

# Check service status
kubectl get pods -l app=user-service

# Monitor logs
kubectl logs -f deployment/user-service
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name add-user-profile

# Deploy to production
npx prisma migrate deploy

# Reset development database
npx prisma migrate reset
```

## 🔧 Development

### Authentication Flow
```typescript
// Complete authentication workflow
export class AuthService {
  async validateAdmin(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    
    if (!user || user.role === Role.PASIEN) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  async login(user: User) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    await this.updateRefreshToken(user.id, refresh_token);
    
    return { user, access_token, refresh_token };
  }
}
```

### Message Pattern Handlers
```typescript
// RabbitMQ message handlers
@MessagePattern('user.create')
async createUserFromMessage(@Payload() data: CreateUserDto) {
  return this.userService.create(data);
}

@MessagePattern('user.check-nik-exists')
async checkNikExists(@Payload() data: { nik: string }) {
  return this.userService.isNikRegistered(data.nik);
}

@MessagePattern('user.get-by-nik')
async getUserByNik(@Payload() data: { nik: string }) {
  return this.userService.findByNik(data.nik);
}
```

## 🚨 Security Considerations

### Password Security
- **BCrypt Hashing**: 12 salt rounds untuk optimal security
- **Password Requirements**: Minimum 6 characters (configurable)
- **Password Validation**: Strong password policies (optional)

### JWT Security
- **Secure Secrets**: 256-bit minimum secrets untuk production
- **Token Expiration**: Short-lived access tokens (15 minutes)
- **Refresh Token Rotation**: Automatic rotation untuk enhanced security
- **Token Blacklisting**: Logout invalidates refresh tokens

### Database Security
- **Prepared Statements**: Prisma ORM prevents SQL injection
- **Data Encryption**: Sensitive data encryption at rest
- **Access Control**: Database user dengan minimal privileges
- **Audit Logging**: Track semua user operations

## 📄 License

Copyright (c) 2024 MediQ Team. All rights reserved.

---

**💡 Tips Keamanan**:
- Gunakan environment variables untuk semua secrets
- Implement rate limiting untuk login endpoints
- Monitor failed login attempts untuk brute force detection
- Regular audit untuk user permissions dan access patterns
- Backup database secara regular dengan encryption

**🔗 Service Dependencies**:
- **API Gateway**: Primary entry point untuk authentication
- **OCR Service**: Auto-registration dari KTP data  
- **Queue Service**: User information untuk queue management
- **Institution Service**: User-institution association management
