# RRF Portal - Complete Setup Guide

## Overview
RRF Portal with NestJS Backend API and Next.js Frontend with role-based authentication.

## Architecture
- **Backend**: NestJS API (Port 4000)
- **Frontend**: Next.js 14 (Port 3000)
- **Authentication**: JWT-based with bcrypt password hashing
- **Deployment**: Docker Compose

## Backend Setup (NestJS)

### 1. Install Dependencies
```bash
cd rrf-portal-backend
npm install
```

### 2. Run Backend (Development)
```bash
npm run start:dev
```

Backend will run on http://localhost:4000

### 3. API Endpoints
- **POST** `/auth/login` - User login
  ```json
  {
    "userId": "hm001",
    "password": "hm123"
  }
  ```
  Returns: `{ access_token, user }`

## Frontend Setup (Next.js)

### 1. Install Dependencies
```bash
cd rrf-portal-nextjs
npm install
```

### 2. Run Frontend (Development)
```bash
npm run dev
```

Frontend will run on http://localhost:3000

## Demo Users

| Role | User ID | Password | Name |
|------|---------|----------|------|
| Hiring Manager | `hm001` | `hm123` | John Doe |
| PMO | `pmo001` | `pmo123` | Priya Sharma |
| Approver | `app001` | `app123` | Sarah Miller |
| HR Team | `hr001` | `hr123` | Mike Johnson |

## Docker Deployment

### Build and Run All Services
```bash
cd RRF_2
docker-compose up --build
```

This will start:
- Backend API on port 4000
- Frontend on port 3000

### Stop Services
```bash
docker-compose down
```

## Project Structure

```
RRF_2/
├── rrf-portal-backend/          # NestJS Backend
│   ├── src/
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── local-auth.guard.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── rrf-portal-nextjs/          # Next.js Frontend
│   ├── app/
│   │   ├── login/              # Login page
│   │   ├── dashboard/          # Hiring Manager
│   │   ├── pmo/                # PMO
│   │   ├── approver/           # Approver
│   │   └── hr/                 # HR Team
│   ├── components/
│   ├── contexts/
│   │   └── AuthContext.jsx     # Auth state management
│   └── package.json
└── docker-compose.yml
```

## Authentication Flow

1. User enters credentials on `/login`
2. Frontend sends POST request to backend `/auth/login`
3. Backend validates credentials using bcrypt
4. If valid, backend returns JWT token and user info
5. Frontend stores token in localStorage
6. Frontend redirects to role-specific dashboard
7. All subsequent requests include JWT token in headers
8. Protected routes check for valid token

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Role-based access control
- ✅ Protected routes
- ✅ Auto-redirect to login if not authenticated
- ✅ Logout functionality

## Development Notes

### Adding New Users
Edit `rrf-portal-backend/src/auth/auth.service.ts` and add to the `users` array.

To generate password hash:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('yourpassword', 10);
console.log(hash);
```

### Environment Variables (Production)
Create `.env` file:
```
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
API_URL=http://localhost:4000
```

## Troubleshooting

### CORS Issues
Ensure backend `main.ts` has correct CORS configuration:
```typescript
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
});
```

### Port Already in Use
```bash
# Kill process on port 4000 (Windows)
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Next Steps

1. Replace mock user database with real database (PostgreSQL/MongoDB)
2. Add password reset functionality
3. Add session management
4. Add rate limiting
5. Add audit logging
6. Add 2FA authentication
