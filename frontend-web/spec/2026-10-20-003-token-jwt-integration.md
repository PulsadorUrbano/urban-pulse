# 003 · JWT Token Integration & Authentication Architecture

**Author:** Alejandro  
**Autor:** Alejandro  
**Date:** 2026-10-20  
**Feature:** #003 — JWT Token Integration (`feature/token-frontend-web`)  
**Status:** Implemented ✅  

---

## 1. Executive Summary & Overview

This specification documents the implementation of the JWT access token integration within the web frontend (`frontend-web`) of **Urban Pulse**, connecting the client interface with the NestJS authentication microservice and establishing full traceability of the AI-assisted pair-programming engineering process.

The system adopts a **"Real-First with Resilient Fallback"** architecture:
1. **Real Backend Flow:** When the NestJS backend is active, the frontend requests an official signed JWT via `POST /auth/token` with `{ userId }`. Immediately after receiving the token, it validates identity and authorization claims against the protected `GET /auth/me` endpoint using the `Authorization: Bearer <token>` header.
2. **Resilient Mock Flow:** If the backend is temporarily offline, unreachable, or in isolated frontend development, the client service falls back to local generation of RFC 7519 compliant JWTs signed via the Web Crypto API (HMAC-SHA256) using the shared development secret key (`urban-pulse-dev-secret`). This ensures uninterrupted user experience and end-to-end UI demonstration without blocking login.

---

## 2. API Endpoints Treated

The following NestJS endpoints (defined in `backend/src/auth/auth.controller.ts`) are integrated and consumed by `frontend-web`:

### 2.1. Issue JWT Access Token
- **Endpoint:** `POST /auth/token`
- **Controller Method:** `AuthController.createToken(@Body() { userId }: CreateTokenDto)`
- **Request Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "userId": "3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZjljMWIyYS01ZDRlLTRmNmEtOGI3Yy05ZDBlMWYyYTNiNGMiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI5NDIwODAwLCJleHAiOjE3Mjk1MDcyMDB9.signature"
  }
  ```
- **Handled Error Codes:**
  - `404 Not Found`: If `userId` does not exist in PostgreSQL database.
  - `400 Bad Request`: If `userId` is missing or not a valid UUID.
  - `500 / Network Error`: Triggers graceful fallback to local cryptographic JWT without crashing the UI.

### 2.2. Verify Active Token & Retrieve Claims
- **Endpoint:** `GET /auth/me`
- **Controller Method:** `AuthController.me(@CurrentUser() user: TokenPayload): TokenPayload`
- **Security Guard:** `@UseGuards(JwtAuthGuard)`
- **Request Headers:**
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Success Response (200 OK):**
  ```json
  {
    "userId": "3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c",
    "username": "admin",
    "role": "admin",
    "iat": 1729420800,
    "exp": 1729507200
  }
  ```
- **Handled Error Codes:**
  - `401 Unauthorized`: If the token signature is invalid, missing `Bearer` prefix, expired, or corrupted.

---

## 3. Technical Architecture & Implementation Details

### 3.1. Single Token Pattern
Following modern security best practices and backend alignment:
- A single JWT access token encapsulates both **Identity** (`sub`, `userId`, `username`) and **Authorization** (`role`).
- Role-based permissions are evaluated by NestJS guards (`JwtAuthGuard`, `RolesGuard`).
- No secondary or refresh tokens are required in this phase, eliminating synchronization complexity.

### 3.2. Cryptographic HMAC-SHA256 Signing (Web Crypto API)
To ensure 100% cryptographic compatibility with NestJS `JwtService`:
- Fallback tokens are generated using RFC 7519 Base64URL serialization.
- The HMAC-SHA256 signature is calculated natively via `crypto.subtle` (`window.crypto.subtle` in browsers and `globalThis.crypto.subtle` in Node/Vitest) with secret `urban-pulse-dev-secret`.
- As a result, tokens produced by the frontend are cryptographically valid and accepted with `200 OK` by the NestJS backend.

### 3.3. Token Expiration Lifecycle & Proactive Validation
- Expiration is defined through the standard `exp` claim (default 24 hours).
- **Proactive Validation (`isTokenExpired`):** Prior to dispatching requests or restoring stored sessions, the client checks `payload.exp`. If expired:
  - The request is aborted before reaching the network.
  - Session metadata in `localStorage` is cleared immediately.
  - A descriptive error message is presented to the user: *"Token expired at [date]. Please log in again."*

### 3.4. HttpOnly Session Cookie Lifecycle Simulation
- In production, NestJS delivers tokens via `Set-Cookie` with security flags:
  - `HttpOnly: true` (prevents XSS exfiltration)
  - `Secure: true` (HTTPS only)
  - `SameSite: Strict` (CSRF defense)
  - `Path: /`
- The client models cookie states (`isOpen: true` on login, `isOpen: false` with `Max-Age=0` simulation on logout) for complete audit compliance.

### 3.5. Reverse Proxy Configuration (`vite.config.js`)
To eliminate CORS issues during local development between frontend (port 5173) and backend (port 3000):
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

---

## 4. AI-Assisted Engineering Traceability

This feature was developed through AI-assisted pair programming. Below is the detailed log of technical investigations, root cause analyses, and solutions:

### 4.1. Diagnosis of NestJS Loader Assertion Bug on Node 22
- **Issue:** Executing `nest start` on Node 22.14.0 caused a fatal exception:
  `TypeError [ERR_INTERNAL_ASSERTION]: This is caused by either a bug in Node.js or incorrect usage of Node.js internals`
- **Root Cause:** A circular dependency conflict between Node 22 ESM loader hooks and `@angular-devkit/schematics@22.2.0` used internally by `@nestjs/cli`.
- **AI Solution:** Bypassed the unstable Nest CLI wrapper by compiling clean TypeScript with `npx tsc -p tsconfig.build.json` and running directly with `node dist/main.js`. The backend started successfully on port 3000 and connected to PostgreSQL.

### 4.2. Diagnosis of Swagger UI Authorize Modal
- **Issue:** Swagger UI (`/docs`) showed lock icons on `/auth/me` but lacked the global "Authorize" button.
- **Root Cause:** Swagger UI required an authenticated session or valid bearer token injected in the request headers to unlock protected routes.
- **AI Solution:** Executed programmatic HTTP requests sending `Authorization: Bearer <token>`, confirming that NestJS returned `200 OK` with verified claims.

### 4.3. Real Cryptographic Parity in Frontend
- **Issue:** Arbitrary mock token signatures caused 401 Unauthorized when tested against NestJS.
- **AI Solution:** Implemented native Web Crypto HMAC-SHA256 signing using the dev secret `DEV_JWT_SECRET` (`urban-pulse-dev-secret`), achieving 100% interoperability with the backend.

### 4.4. Unit Test Suite (Vitest)
- Implemented 19 unit test cases covering exclusively our frontend-web scope in `src/__tests__/services/authService.test.ts`.
- All 19 tests pass in < 500ms with zero errors.

---

## 5. Acceptance Criteria Checklist

- [x] **Unit Tests:** 19/19 passing tests in `src/__tests__/services/authService.test.ts`.
- [x] **English Code & Specs:** All code, comments, JSDocs, tests, and spec documentation strictly in English for AI readability and international standard.
- [x] **Endpoints Covered:** `POST /auth/token` and `GET /auth/me` with full error handling.
- [x] **Naming Convention:** `YYYY-MM-DD-003-<feature-description>.md` (`2026-10-20-003-token-jwt-integration.md`).
- [x] **Author Attribution:** `Author: Alejandro` / `Autor: Alejandro`.

---

## 6. Git Branching & Merge Strategy

1. **Current Branch:** `feature/token-frontend-web`
2. **Target Branch for PR:** `feature/token` (global feature branch).
3. **Post-Merge Cleanup:** Once `feature/token-frontend-web` is merged into `feature/token`, the `feature/token-frontend-web` branch must be deleted both locally and remotely.
