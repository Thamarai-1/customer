# API Specification & Reference Documentation

## 1. Overview & Base URL

All endpoints are versioned and exposed under the base prefix:
```
http://localhost:5000/api/v1
```

### Response Standards
All responses follow the unified envelope:
- **Success**:
  ```json
  {
    "success": true,
    "message": "Descriptive success message",
    "data": {},
    "meta": {}
  }
  ```
- **Error**:
  ```json
  {
    "success": false,
    "message": "Descriptive error message",
    "error": {
      "code": "ERROR_CODE",
      "message": "Detailed error summary",
      "details": []
    },
    "errors": []
  }
  ```

---

## 2. Authentication & Session APIs (`/api/v1/auth`)

### 2.1 Login
- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Auth**: Public (Rate-limited: 20 attempts / 15 mins)
- **Request Body**:
  ```json
  {
    "email": "priya.marketing@example.com",
    "password": "Marketing@2026!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "user": {
        "id": "6afad...",
        "name": "Priya Sharma",
        "email": "priya.marketing@example.com",
        "role": "MARKETING_MANAGER",
        "isActive": true,
        "lastLoginAt": "2026-11-16T10:00:00.000Z"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized` (`INVALID_CREDENTIALS`): "Invalid email or password"
  - `403 Forbidden` (`ACCOUNT_INACTIVE`): "Account is inactive"
  - `429 Too Many Requests` (`RATE_LIMITED`): "Too many login attempts"

### 2.2 Refresh Token Rotation
- **Method**: `POST`
- **URL**: `/api/v1/auth/refresh`
- **Auth**: Public (Requires valid Refresh Token via Cookie or Body)
- **Request Body** (optional if `refreshToken` cookie is set):
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Success Response (200 OK)**: Returns rotated `accessToken` and `refreshToken`.
- **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): "Invalid or expired refresh token"
  - `401 Unauthorized` (`SECURITY_ALERT`): "Refresh token reuse detected. All sessions terminated."

### 2.3 Logout
- **Method**: `POST`
- **URL**: `/api/v1/auth/logout`
- **Auth**: Public
- **Success Response (200 OK)**: Clears refresh cookie and marks token revoked.

### 2.4 Current User Profile
- **Method**: `GET`
- **URL**: `/api/v1/auth/me`
- **Auth**: Bearer Token required
- **Success Response (200 OK)**: Returns authenticated `req.user` payload.

### 2.5 Change Password
- **Method**: `POST`
- **URL**: `/api/v1/auth/change-password`
- **Auth**: Bearer Token required
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "BrandNewPassword123!"
  }
  ```
- **Success Response (200 OK)**: Password updated and all previous refresh tokens invalidated.

---

## 3. User Management APIs (`/api/v1/users`)

All routes require `Bearer` token with `ADMIN` role.

### 3.1 List Users
- **Method**: `GET`
- **URL**: `/api/v1/users`
- **Query Parameters**: `page` (default 1), `limit` (default 20), `search`, `sortBy`, `sortOrder`
- **Success Response (200 OK)**: Returns user array and pagination meta.

### 3.2 Create User
- **Method**: `POST`
- **URL**: `/api/v1/users`
- **Request Body**:
  ```json
  {
    "name": "David Miller",
    "email": "david.compliance@example.com",
    "password": "Compliance@2026!",
    "role": "COMPLIANCE_REVIEWER",
    "department": "Legal & Risk"
  }
  ```
- **Success Response (201 Created)**

### 3.3 Deactivate User
- **Method**: `DELETE`
- **URL**: `/api/v1/users/:id`
- **Success Response (200 OK)**: Marks `isActive: false` and revokes sessions.

---

## 4. Customer Management APIs (`/api/v1/customers`)

All routes require authentication.

### 4.1 List Customers
- **Method**: `GET`
- **URL**: `/api/v1/customers`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Query Parameters**:
  - `page`, `limit`, `search` (text search on name, email, customerId)
  - `loyaltyTier` (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`)
  - `accountStatus` (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `ARCHIVED`)
  - `activePlan`
  - `planStatus` (`ACTIVE`, `PENDING`, `EXPIRED`, `CANCELLED`)
  - `customerType` (`RETAIL`, `TELECOM`, `ENTERPRISE`, `INDIVIDUAL`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Customers retrieved successfully",
    "data": [
      {
        "customerId": "CUST-1001",
        "firstName": "Aarav",
        "lastName": "Sharma",
        "email": "aarav.sharma.0@example.com",
        "customerType": "TELECOM",
        "accountStatus": "ACTIVE",
        "loyaltyInfo": {
          "loyaltyTier": "SILVER",
          "loyaltyPoints": 650
        },
        "subscription": {
          "activePlan": "Unlimited 5G Pro",
          "planStatus": "ACTIVE"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalRecords": 120,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

### 4.2 Get Customer
- **Method**: `GET`
- **URL**: `/api/v1/customers/:id` (Accepts MongoDB `_id` or `customerId`)
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`

### 4.3 Create Customer
- **Method**: `POST`
- **URL**: `/api/v1/customers`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`
- **Request Body**:
  ```json
  {
    "customerId": "CUST-2001",
    "firstName": "Rohan",
    "lastName": "Verma",
    "email": "rohan.verma@example.com",
    "phone": "+1-555-0909",
    "customerType": "TELECOM",
    "loyaltyInfo": {
      "loyaltyTier": "GOLD",
      "loyaltyPoints": 1500
    },
    "subscription": {
      "activePlan": "Gigabit Home Fiber",
      "planType": "Postpaid",
      "planStatus": "ACTIVE"
    }
  }
  ```

### 4.4 Update Customer
- **Method**: `PUT`
- **URL**: `/api/v1/customers/:id`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`

### 4.5 Update Status
- **Method**: `PATCH`
- **URL**: `/api/v1/customers/:id/status`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`
- **Request Body**: `{ "status": "SUSPENDED" }`

### 4.6 Archive / Soft Delete
- **Method**: `DELETE`
- **URL**: `/api/v1/customers/:id`
- **Allowed Roles**: `ADMIN` only

---

## 5. Consolidated Customer Profile Assembly (`/api/v1/customers/:id/profile`)

- **Method**: `GET`
- **URL**: `/api/v1/customers/:id/profile`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Description**: High-performance consolidated profile combining customer records, subscription data, 30d vs 60d activity counts, billing statuses, and communication preferences in parallel.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Customer profile assembled successfully",
    "data": {
      "customer": {
        "customerId": "CUST-1001",
        "firstName": "Aarav",
        "lastName": "Sharma",
        "email": "aarav.sharma.0@example.com",
        "loyaltyTier": "SILVER",
        "loyaltyPoints": 650
      },
      "subscription": {
        "activePlan": "Unlimited 5G Pro",
        "planStatus": "ACTIVE"
      },
      "activity": {
        "lastActivityDate": "2026-11-15T08:30:00.000Z",
        "activityCount30d": 12,
        "activityCountPrevious30d": 14,
        "activityTrend": "STABLE"
      },
      "billing": {
        "totalInvoiced": 239.97,
        "outstandingAmount": 0,
        "currency": "USD",
        "paymentStatus": "PAID",
        "overdueInvoicesCount": 0,
        "hasDisputedInvoices": false
      },
      "communicationPreferences": {
        "emailConsent": true,
        "smsConsent": true,
        "preferredChannel": "EMAIL",
        "optedOut": false
      }
    }
  }
  ```

---

## 6. Customer Activity APIs (`/api/v1/customers/:id/activities`)

- `POST /api/v1/customers/:id/activities`: Log activity (`LOGIN`, `PURCHASE`, `PLAN_RENEWAL`, `SERVICE_USAGE`, `SUPPORT_INTERACTION`, `APP_INTERACTION`).
- `GET /api/v1/customers/:id/activities`: List activity history with date filters and pagination.
- `GET /api/v1/customers/:id/activity-summary`: Returns 30d vs previous 30d count comparison and activity trend.

---

## 7. Billing Record APIs (`/api/v1/customers/:id/billing` & `/api/v1/billing`)

- `POST /api/v1/customers/:id/billing`: Create verified invoice.
- `GET /api/v1/customers/:id/billing`: List customer invoices.
- `GET /api/v1/customers/:id/billing-summary`: Outstanding balance, overdue count, and payment status.
- `GET /api/v1/billing`: Global billing records across all customers with status filtering.

---

## 8. Communication Preference APIs (`/api/v1/customers/:id/preferences`)

- `GET /api/v1/customers/:id/preferences`: Retrieve email/SMS/WhatsApp consent, opt-out status, and preferred channel.
- `PUT /api/v1/customers/:id/preferences`: Update preferences with audit timestamp.

---

## 9. CSV and JSON Data Import (`/api/v1/customers/import`)

- **Method**: `POST`
- **URL**: `/api/v1/customers/import`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`
- **Content-Type**: `multipart/form-data` with form field `file` (`.csv` or `.json`), or raw JSON array body.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data import completed: 92 succeeded, 8 failed.",
    "data": {
      "totalRecords": 100,
      "successfulRecords": 92,
      "failedRecords": 8,
      "duplicates": 3,
      "errors": [
        {
          "row": 12,
          "field": "email",
          "message": "Invalid email address format"
        }
      ]
    }
  }
  ```

---

## 10. Customer Segmentation Engine APIs (`/api/v1/segmentation`)

### 10.1 Classify Single Customer
- **Method**: `POST`
- **URL**: `/api/v1/segmentation/customers/:customerId/classify`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`
- **Description**: Deterministically analyzes verified customer profile, billing ledger, and activity history against configured thresholds, persists classification, and returns evidence.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Customer classified successfully",
    "data": {
      "customerId": "CUST-1001",
      "primarySegment": "CONSISTENT_CUSTOMER",
      "segments": ["CONSISTENT_CUSTOMER"],
      "classificationStatus": "CLASSIFIED",
      "confidence": 0.95,
      "reasonCodes": [
        "REGULAR_ACTIVITY",
        "ACTIVE_PLAN",
        "PAYMENT_ON_TIME",
        "CONSISTENT_ENGAGEMENT"
      ],
      "explanations": [
        "Customer logged 8 activities in the past 30 days, demonstrating steady ongoing platform interaction.",
        "Customer holds an active subscription under plan 'Unlimited 5G Pro' (Postpaid).",
        "All billing invoices are fully paid on time with zero overdue balances across the billing history.",
        "Customer demonstrates consistent multi-month interaction frequency and positive account standing."
      ],
      "evidence": {
        "lastActivityDate": "2026-11-14T10:04:28.000Z",
        "daysSinceLastActivity": 2,
        "activityCount30d": 8,
        "activityCountPrevious30d": 7,
        "activityReductionPercent": 0,
        "lifetimeActivityCount": 15,
        "loyaltyTier": "SILVER",
        "loyaltyPoints": 650,
        "membershipDurationDays": 184,
        "activePlan": "Unlimited 5G Pro",
        "planStatus": "ACTIVE",
        "planType": "Postpaid",
        "totalInvoiced": 480.00,
        "totalOutstandingAmount": 0.00,
        "overdueInvoiceCount": 0,
        "oldestOverdueDays": 0,
        "oldestOverdueInvoiceId": null,
        "overdueInvoiceIds": [],
        "disputeCount": 0,
        "hasDisputedInvoices": false,
        "hasNonDisputedOverdue": false
      },
      "ruleVersion": "1.0.0",
      "classifiedAt": "2026-11-16T12:00:00.000Z"
    }
  }
  ```

### 10.2 Get Customer Classification
- **Method**: `GET`
- **URL**: `/api/v1/segmentation/customers/:customerId`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Description**: Returns the latest classification for a customer. If never evaluated before, triggers on-demand deterministic classification.

### 10.3 Bulk Classify All Customers
- **Method**: `POST`
- **URL**: `/api/v1/segmentation/classify-all`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`
- **Request Body (optional)**:
  ```json
  {
    "batchSize": 100
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Batch customer classification completed successfully",
    "data": {
      "totalCustomers": 120,
      "processedCount": 120,
      "classifiedCount": 118,
      "insufficientDataCount": 2,
      "failedCount": 0,
      "multiSegmentCount": 18,
      "durationMs": 485
    }
  }
  ```

### 10.4 Get Segment Catalog Definitions
- **Method**: `GET`
- **URL**: `/api/v1/segmentation/segments`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Description**: Returns the 5 configured primary segment definitions, priorities, and descriptions.

### 10.5 Get Customers by Segment
- **Method**: `GET`
- **URL**: `/api/v1/segmentation/segments/:segmentName/customers?page=1&limit=20&search=...&status=...`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Path Parameter**: `:segmentName` = `OVERDUE_BILL` | `INACTIVE` | `DECLINING_ACTIVITY` | `LOYALTY_CANDIDATE` | `CONSISTENT_CUSTOMER` | `ALL`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Records per page (default: 20)
  - `search`: Search filter matching customer ID or plan name
  - `status`: Filter by `CLASSIFIED` | `INSUFFICIENT_DATA`
  - `minConfidence`: Minimum confidence filter (0.0 to 1.0)
  - `sortBy`: Field to sort by (default: `classifiedAt`)
  - `sortOrder`: `asc` | `desc` (default: `desc`)

### 10.6 Get Segmentation Statistics
- **Method**: `GET`
- **URL**: `/api/v1/segmentation/statistics`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Segmentation statistics calculated successfully",
    "data": {
      "totalCustomers": 120,
      "classifiedCustomers": 118,
      "unclassifiedCustomers": 0,
      "insufficientDataCustomers": 2,
      "multiSegmentCustomers": 18,
      "segmentCounts": {
        "OVERDUE_BILL": 20,
        "INACTIVE": 20,
        "DECLINING_ACTIVITY": 25,
        "LOYALTY_CANDIDATE": 30,
        "CONSISTENT_CUSTOMER": 30
      },
      "primarySegmentCounts": {
        "OVERDUE_BILL": 20,
        "INACTIVE": 20,
        "DECLINING_ACTIVITY": 25,
        "LOYALTY_CANDIDATE": 25,
        "CONSISTENT_CUSTOMER": 28
      },
      "segmentPercentages": {
        "OVERDUE_BILL": 16.9,
        "INACTIVE": 16.9,
        "DECLINING_ACTIVITY": 21.2,
        "LOYALTY_CANDIDATE": 25.4,
        "CONSISTENT_CUSTOMER": 25.4
      },
      "lastRunTimestamp": "2026-11-16T12:00:00.000Z"
    }
  }
  ```

### 10.7 Get Customer Classification History
- **Method**: `GET`
- **URL**: `/api/v1/segmentation/customers/:customerId/history?limit=20`
- **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Description**: Returns immutable audit trail of past classifications, timestamps, rule versions, and transitions.

### 10.8 Get & Update Segmentation Configuration
- **Get Active Config**: `GET /api/v1/segmentation/config`
  - **Allowed Roles**: `ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`
- **Update Configuration**: `PUT /api/v1/segmentation/config`
  - **Allowed Roles**: `ADMIN` only
  - **Request Body**:
    ```json
    {
      "ruleVersion": "1.1.0",
      "activityReductionThresholdPercent": 50,
      "inactivityThresholdDays": 60,
      "loyaltyPointsThreshold": 1200,
      "membershipDurationDaysThreshold": 180,
      "notes": "Updated for enterprise seasonal review"
    }
    ```
