# Global Exception Handler - Examples

## ✅ Successfully Added!

Your backend now has a **Global Exception Handler** that catches all errors automatically.

---

## 📋 What It Does:

1. **Catches all errors** - HTTP exceptions, validation errors, server errors
2. **Logs errors** - With timestamp, path, method, and stack trace
3. **Returns consistent format** - All errors follow the same JSON structure
4. **Hides sensitive info** - Stack traces not exposed to clients

---

## 🔍 Error Response Format:

```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2026-03-30T06:12:45.123Z",
  "path": "/auth/login",
  "method": "POST",
  "error": "UnauthorizedException",
  "message": "Invalid credentials"
}
```

---

## 📝 Example Scenarios:

### 1. Invalid Login (401 Unauthorized)
**Request:**
```bash
POST /auth/login
Body: { "userId": "wrong", "password": "wrong" }
```

**Response:**
```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2026-03-30T06:12:45.123Z",
  "path": "/auth/login",
  "method": "POST",
  "error": "UnauthorizedException",
  "message": "Invalid credentials"
}
```

---

### 2. Route Not Found (404)
**Request:**
```bash
GET /api/nonexistent
```

**Response:**
```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-03-30T06:13:20.456Z",
  "path": "/api/nonexistent",
  "method": "GET",
  "error": "NotFoundException",
  "message": "Cannot GET /api/nonexistent"
}
```

---

### 3. Validation Error (400)
**Request:**
```bash
POST /rrf/create
Body: { } // Missing required fields
```

**Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-03-30T06:14:10.789Z",
  "path": "/rrf/create",
  "method": "POST",
  "error": "BadRequestException",
  "message": ["title should not be empty", "department is required"]
}
```

---

### 4. Server Error (500)
**Request:**
```bash
GET /api/something-broken
```

**Response:**
```json
{
  "success": false,
  "statusCode": 500,
  "timestamp": "2026-03-30T06:15:30.012Z",
  "path": "/api/something-broken",
  "method": "GET",
  "error": "InternalServerErrorException",
  "message": "Internal server error"
}
```

---

## 🛠️ How to Use in Your Code:

### Throwing Custom Errors:

```typescript
import { 
  BadRequestException, 
  NotFoundException, 
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException 
} from '@nestjs/common';

// In your service or controller:

// Bad Request (400)
throw new BadRequestException('Invalid input data');

// Not Found (404)
throw new NotFoundException('RRF not found');

// Unauthorized (401)
throw new UnauthorizedException('Invalid token');

// Forbidden (403)
throw new ForbiddenException('You do not have permission');

// Server Error (500)
throw new InternalServerErrorException('Something went wrong');
```

---

## 📊 Server Logs Example:

When an error occurs, the server logs it:

```
[GlobalExceptionFilter] [POST] /auth/login - Status: 401
Error: Invalid credentials
    at LocalStrategy.validate (/app/src/auth/local.strategy.ts:18:13)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
```

---

## 🎯 Benefits:

✅ **Consistent API** - All errors follow same format  
✅ **Better debugging** - Detailed logs with stack traces  
✅ **User-friendly** - Clean error messages for frontend  
✅ **Secure** - No sensitive data exposed  
✅ **Automatic** - No need to add try-catch everywhere  

---

## 🚀 Files Created:

1. `src/common/filters/http-exception.filter.ts` - Exception filter
2. `src/main.ts` - Registered globally

---

Your backend is now production-ready with professional error handling! 🎉
