# API Design Specification & Conventions

## 1. API Architecture & Versioning

All API endpoints follow strict RESTful principles and are versioned with a global URI prefix:

```
/api/v1
```

All requests and responses use `application/json` content type with UTF-8 encoding.

---

## 2. Standard Response Conventions

Every endpoint returns a predictable, type-safe envelope structured according to the `ApiResponse<T>` contract.

### 2.1. Successful Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-11-16T14:30:00.000Z"
}
```

### 2.2. Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation error",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format"
      }
    ]
  },
  "timestamp": "2026-11-16T14:30:00.000Z"
}
```

---

## 3. Implemented Phase 1 Endpoints

### 3.1. Basic Health Check (Liveness Probe)
- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Access**: Public
- **Description**: Verifies the API web server is online and accepting connections.
- **Response**:
```json
{
  "success": true,
  "message": "Customer Engagement Assistant API is running",
  "timestamp": "2026-11-16T14:30:00.000Z"
}
```

### 3.2. Detailed Readiness Probe
- **Method**: `GET`
- **Route**: `/api/v1/health/readiness`
- **Access**: Public
- **Description**: Evaluates connectivity to MongoDB primary database and Redis cache layer. Returns `503 Service Unavailable` if MongoDB is down.
- **Response (Healthy)**:
```json
{
  "success": true,
  "message": "All core infrastructure services are healthy",
  "timestamp": "2026-11-16T14:30:00.000Z",
  "services": {
    "database": {
      "status": "UP",
      "latencyMs": 4,
      "details": "MongoDB ping responsive"
    },
    "redis": {
      "status": "UP",
      "latencyMs": 2,
      "details": "Redis PING successful"
    }
  }
}
```

---

## 4. Standard Error Codes & Status Codes

| HTTP Status | Error Code | Description |
|:---|:---|:---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload failed Zod schema validation |
| `400 Bad Request` | `INVALID_ID` | Malformed ObjectId or business key format |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid JWT token (Phase 2) |
| `403 Forbidden` | `FORBIDDEN` | Caller lacks the necessary role or permission |
| `404 Not Found` | `NOT_FOUND` | The requested route or resource does not exist |
| `409 Conflict` | `CONFLICT` | Resource already exists or version concurrency failure |
| `429 Too Many Requests` | `RATE_LIMITED` | Redis rate limiter threshold exceeded |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected unhandled server exception |
| `503 Unavailable` | `SERVICE_UNAVAILABLE` | Database or required downstream infrastructure down |

---

## 5. Future API Module Structure (Phase 2 - Phase 8)

The backend modular monolith will expose the following endpoint groups under `/api/v1`:

```
/api/v1/auth/          -> Authentication & Token Refresh (Phase 2)
/api/v1/users/         -> Operator & Reviewer Management (Phase 2)
/api/v1/customers/     -> Customer Profiles & Activity Timeline (Phase 3)
/api/v1/segmentation/  -> Customer Classification & Reason Codes (Phase 3)
/api/v1/campaigns/     -> Campaign Configuration & Guidelines (Phase 4)
/api/v1/offers/        -> Rewards & Eligibility Catalog (Phase 4)
/api/v1/billing/       -> Overdue Records & Reminder Progression (Phase 4)
/api/v1/ai/            -> Grounded Message Generation Engine (Phase 5)
/api/v1/compliance/    -> Safety, Guardrails & Consent Checks (Phase 6)
/api/v1/approvals/     -> Human Review Queue & Feedback (Phase 7)
/api/v1/delivery/      -> Controlled Dispatch & Mock Sender (Phase 8)
/api/v1/audit/         -> Observability & Audit Log Explorer (Phase 8)
```
