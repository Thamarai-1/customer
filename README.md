# Customer Loyalty and Engagement Assistant

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)

> **HCLTech Future Ready AI Engineer Hackathon**  
> **Use Case**: GenAI-powered Customer Loyalty and Engagement Assistant for Retail and Telecom Organizations.

---

## 1. Project Overview

The **Customer Loyalty and Engagement Assistant** categorizes retail and telecom customers using permitted activity, loyalty, active-plan, and payment consistency indicators, and then prepares grounded, policy-compliant personalized communications.

- **Deterministic Business Logic**: Transparent customer segmentation, eligibility rules, billing progression, and compliance guardrails.
- **Probabilistic GenAI**: Grounded message drafting bounded by verified customer facts (integrated in Phase 5).
- **Human-in-the-Loop Review**: Mandatory approval queue and audit logging before any message is dispatched.

This repository contains the completed **Phase 1: Project Initialization, Architecture and Database Design**, **Phase 2: Backend Foundation, Authentication, and Customer Management**, and **Phase 3: Customer Segmentation Engine**.

---

## 2. Architecture & Modular Monolith

The platform uses a **Modular Monolith** architecture:
- Frontend and backend live in a unified repository with independent build lifecycles and strict boundary separation.
- Backend modules follow a service-oriented structure: Routes, Controllers, Services, Repositories, Models, Middlewares, Schemas, and Types.
- 13 concrete MongoDB data models define the future data contracts.
- Phase 2 establishes enterprise authentication (JWT + HttpOnly cookies + token rotation with reuse detection), RBAC (`ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`), customer management, consolidated customer 360° profile assembly, activity tracking, billing record management, communication preferences, and resilient CSV/JSON data ingestion.
- Phase 3 delivers a transparent, deterministic customer segmentation engine: multi-label categorization across 5 primary segments, priority hierarchy, explainable reason codes, grounded evidence collection, dynamic confidence calculation, configuration management, and full analytics dashboard with Recharts.

For complete architectural specifications and Mermaid diagrams, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md).

---

## 3. Repository Structure

```
customer-engagement-assistant/
├── frontend/                     # Next.js 14 App Router, TypeScript, Tailwind CSS
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── app/                  # App Router layout, pages, and providers
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components (button, card, badge, input)
│   │   │   ├── layout/           # AppShell, Sidebar, TopNavbar
│   │   │   └── shared/           # Status and metric presentation components
│   │   ├── hooks/                # Custom hooks (TanStack Query health hooks)
│   │   ├── services/             # API client services
│   │   ├── lib/                  # Utilities (cn helper)
│   │   ├── types/                # TypeScript types
│   │   └── constants/            # Navigation items & module configurations
│   ├── tests/                    # Frontend Vitest & React Testing Library tests
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── backend/                      # Node.js, Express, TypeScript, Mongoose ODM
│   ├── src/
│   │   ├── config/               # env.ts, database.ts, redis.ts
│   │   ├── modules/              # Domain-driven modular structure
│   │   │   ├── auth/             # Authentication & token verification (Phase 2)
│   │   │   ├── users/            # User model & repository
│   │   │   ├── customers/        # Customer model & profile management
│   │   │   ├── segmentation/     # Customer segment model & rule definitions
│   │   │   ├── campaigns/        # Campaign configuration model
│   │   │   ├── offers/           # Offer & reward catalog model
│   │   │   ├── billing/          # Billing record model & reminder progression
│   │   │   ├── ai/               # Generated message model (Phase 5)
│   │   │   ├── compliance/       # Validation result model & safety checks
│   │   │   ├── approvals/        # Human reviewer approval model
│   │   │   ├── delivery/         # Communication preferences & history models
│   │   │   └── audit/            # Audit log & customer activity models
│   │   ├── middleware/           # Error handler, 404 handler, request logger
│   │   ├── routes/               # API v1 routes & health endpoints
│   │   ├── types/                # Domain types & API responses
│   │   ├── utils/                # Logger & response utilities
│   │   ├── app.ts                # Express app configuration
│   │   └── server.ts             # Server entry point & graceful shutdown
│   ├── tests/                    # Backend Vitest tests (health, env, db, redis)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── infrastructure/
│   ├── nginx/
│   │   └── nginx.conf            # Nginx reverse proxy configuration
│   └── docker/
│
├── datasets/                     # Synthetic test datasets (gitkeep)
│
├── docs/
│   ├── ARCHITECTURE.md           # System architecture & Mermaid diagrams
│   ├── DATABASE.md               # MongoDB collection specifications & ERD
│   ├── API_DESIGN.md             # API conventions & endpoint contracts
│   └── DEVELOPMENT.md            # Developer setup guide
│
├── docker-compose.yml            # Multi-container orchestration (5 services)
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git ignore rules
└── README.md
```

---

## 4. Quick Start & Execution Instructions

### Prerequisites
- Node.js 20+ and npm 10+
- MongoDB and Redis (local instances or via Docker)

### Default Seed Credentials

When MongoDB connects, an initial administrator account is automatically bootstrapped if no admin exists:
- **Admin Email**: `admin@engagement.hcl.com`
- **Admin Password**: `AdminSecure123!`
- **Role**: `ADMIN`

Additional demo users seeded via `npm run seed:users`:
- **Marketing Manager**: `priya.marketing@example.com` / `MarketPass123!`
- **Compliance Reviewer**: `david.compliance@example.com` / `ReviewerPass123!`

### Option A: Local Development (Recommended for rapid testing)

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Run Backend (Port 5000)**:
   ```bash
   cd backend
   npm install
   npm run build
   npm test
   npm run seed        # Seeds users, 120 customers, activities, billing, and preferences
   npm run dev
   ```

3. **Run Frontend (Port 3000)**:
   ```bash
   cd frontend
   npm install
   npm test
   npm run build
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser. Navigate to `http://localhost:3000/login` to authenticate or `http://localhost:3000/customers` to inspect customer profiles.

### Option B: Docker Compose (All Services)

```bash
docker compose up --build -d
```
Services will be accessible at:
- Gateway (Nginx): `http://localhost:80`
- Frontend: `http://localhost:3000`
- Backend API & Health: `http://localhost:5000/api/v1/health`

---

## 5. Testing & Verification

### Backend Tests
Execute unit and integration tests across segmentation engine rules, evaluation scenarios, API endpoints, authentication, token rotation, RBAC, customer management, profile assembly, CSV/JSON import, health, environment validation, database lifecycle, and Redis client handling:
```bash
cd backend
npm test
```
**Results**: 11 test suites passed, 60 tests passed (100% pass rate).

### Frontend Tests & Typecheck
Execute UI layout shell tests and production build verification:
```bash
cd frontend
npm test
npm run build
```
**Results**: 1 test suite passed, 4 tests passed, Next.js production build generated cleanly (`/`, `/login`, `/customers`, `/customers/[id]`, `/segments`).

---

## 6. Phase Deliverables & Status

### Completed in Phase 1, Phase 2 & Phase 3
- **Phase 1: Foundation**: Modular monolith architecture, TypeScript strict configs, Express + Mongoose + Redis connectivity, 13 data models, Docker + Nginx orchestration, and comprehensive system documentation.
- **Phase 2: Authentication & RBAC**: JWT access + refresh token rotation, HttpOnly cookie support, token reuse revocation, login rate limiting, password hashing with bcrypt, central permission matrix (`ADMIN`, `MARKETING_MANAGER`, `COMPLIANCE_REVIEWER`), admin bootstrap.
- **Phase 2: Customer Management & Profile Assembly**: Full CRUD, business `customerId` indexing, soft deletion/archival, multi-field search, filters, pagination, parallel 360° profile assembly, activity velocity, billing ledger, and communication preferences.
- **Phase 2: Ingestion & Synthetic Data**: Resilient CSV/JSON import with row-level error reporting, and 120 synthetic customer personas.
- **Phase 3: Customer Segmentation Engine**:
  - Deterministic, explainable business logic evaluating activity velocity, loyalty tenure, active plans, and billing status.
  - Multi-label classification supporting all 5 primary segments: `OVERDUE_BILL`, `INACTIVE`, `DECLINING_ACTIVITY`, `LOYALTY_CANDIDATE`, `CONSISTENT_CUSTOMER`.
  - Configurable primary segment selection hierarchy.
  - Centralized reason code system with evidence-grounded human-readable explanations.
  - Transparent, evidence-completeness confidence calculation.
  - Insufficient data handling (`INSUFFICIENT_DATA` status with bounded confidence).
  - Explicit dispute exclusions preventing unwarranted overdue classifications.
  - Dual collection architecture: latest snapshot collection + immutable classification history collection.
  - Non-blocking batch processing (`POST /api/v1/segmentation/classify-all`) capable of handling large customer volumes without memory bloat.
  - Dynamic rule configuration APIs (`GET /api/v1/segmentation/config`, `PUT /api/v1/segmentation/config`) with semantic versioning and administrative RBAC.
  - Interactive Next.js Frontend Dashboard (`/segments`) with Recharts visual distribution charts, segment category cards, filterable customer ledger, and 360° evidence inspection modal.

### Intentionally Deferred to Phase 4 and Beyond
- **Phase 4**: Campaign policy engine, offer/reward eligibility, billing reminder progression logic.
- **Phase 5**: LangGraph.js orchestration and multi-model GenAI integration (OpenAI, Gemini, Claude).
- **Phase 6**: Groundedness verification, safety guardrails, compliance checks, sensitive data detection.
- **Phase 7**: Interactive human-in-the-loop approval workflow and feedback capture.
- **Phase 8**: Controlled delivery, mock email dispatcher, and audit log explorer.
