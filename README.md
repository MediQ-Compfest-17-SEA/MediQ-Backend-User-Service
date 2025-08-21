# MediQ User Service

Mikroservice untuk manajemen pengguna (user management) dalam sistem MediQ. Service ini menangani autentikasi, registrasi, dan pengelolaan data pengguna termasuk data KTP lengkap.

## 🚀 Features

- **Autentikasi JWT** - Login dengan access dan refresh tokens
- **Role-based Access Control** - PASIEN, OPERATOR, ADMIN_FASKES
- **KTP Data Storage** - Menyimpan data lengkap dari hasil OCR KTP
- **Data Validation** - Validasi NIK, email, dan data KTP
- **Microservice Integration** - RabbitMQ message handling

## 📊 Database Schema

### User Model
```sql
model User {
  id                 String    @id @default(uuid())
  nik                String    @unique          -- Nomor Induk Kependudukan
  name               String                     -- Nama lengkap
  email              String?   @unique          -- Email (optional untuk OCR users)
  password           String?                    -- BCrypt hashed password (optional)
  role               Role      @default(PASIEN) -- User role
  
  -- KTP Data Fields (dari OCR)
  tempat_lahir       String?   -- Tempat lahir
  tgl_lahir          String?   -- Tanggal lahir (DD-MM-YYYY)
  jenis_kelamin      String?   -- LAKI-LAKI/PEREMPUAN
  alamat_jalan       String?   -- Alamat jalan lengkap
  alamat_kel_desa    String?   -- Kelurahan/Desa
  alamat_kecamatan   String?   -- Kecamatan
  alamat_rt_rw       String?   -- RT/RW
  agama              String?   -- Agama
  status_perkawinan  String?   -- Status perkawinan
  pekerjaan          String?   -- Pekerjaan
  kewarganegaraan    String?   -- WNI/WNA
  berlaku_hingga     String?   -- Masa berlaku KTP
  
  hashedRefreshToken String?   -- Refresh token (hashed)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

enum Role {
  PASIEN        -- Pasien/User biasa
  OPERATOR      -- Operator faskes
  ADMIN_FASKES  -- Admin fasilitas kesehatan
}
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Login dengan email/password
- `POST /auth/login/admin` - Login admin
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### User Management
- `POST /users` - Create user (dengan data KTP lengkap)
- `GET /users` - Get all users (Admin only)
- `GET /users/profile` - Get current user profile
- `PATCH /users/:id/role` - Update user role (Admin only)
- `DELETE /users/:id` - Delete user (Admin only)
- `GET /users/check-nik/:nik` - Check NIK registration status

## 📨 Message Patterns (RabbitMQ)

Service ini mendengarkan pesan dari queue `user_service_queue`:

### Incoming Messages
```typescript
// Create user dari OCR service
'user.create' -> CreateUserDto (dengan data KTP lengkap)

// Check NIK exists
'user.check-nik-exists' -> { nik: string }

// Get user by NIK  
'user.get-by-nik' -> { nik: string }

// Get user by ID
'user.get-by-id' -> { id: string }

// Health check
'user.health' -> {}
```

### Response Format
```typescript
// User creation response
{
  id: string,
  nik: string,
  name: string,
  email?: string,
  role: Role,
  // ... KTP fields
  createdAt: Date,
  updatedAt: Date
}

// NIK check response
boolean

// Health response
{ status: 'ok', service: 'user-service', timestamp: Date }
```

## 🔧 Environment Variables

```env
DATABASE_URL="mysql://root:password@localhost:3306/mediq_users"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
RABBITMQ_URL="amqp://localhost:5672"
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

### OCR Service Integration
- Menerima data KTP lengkap dari OCR Service
- Otomatis membuat user baru dengan data KTP hasil scan
- Mendukung user tanpa email/password (khusus untuk OCR)

### API Gateway Integration
- Semua endpoints exposed melalui API Gateway
- JWT authentication dan role-based authorization
- Rate limiting dan circuit breaker patterns

### Queue Service Integration
- Setelah user dibuat dari OCR, otomatis didaftarkan ke antrian
- Mendukung registrasi dengan institution ID

## 🏥 Flow untuk Registrasi via OCR

1. **KTP Scan** - User scan KTP di OCR Service
2. **OCR Processing** - OCR Service extract data KTP
3. **User Creation** - OCR Service kirim data ke User Service
4. **Data Storage** - User Service simpan data KTP lengkap
5. **Queue Registration** - User otomatis masuk antrian faskes

## 🛡️ Security Features

- **Password Hashing** - BCrypt dengan salt rounds 10
- **JWT Tokens** - Access (15 min) + Refresh (7 days)
- **Role-based Access** - Guard dan decorator untuk authorization
- **Data Validation** - Class-validator untuk input validation
- **NIK Uniqueness** - Cegah duplikasi NIK dalam sistem

## 📊 Monitoring & Health

- Health check endpoint: `GET /health`
- Service status monitoring
- Database connection monitoring
- RabbitMQ connection status

---

**Port:** 8602  
**Public URL:** https://mediq-user-service.craftthingy.com  
**Database:** MySQL - mediq_users  
**Queue:** user_service_queue
