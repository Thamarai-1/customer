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

This repository represents the completed **Phase 1: Project Initialization, Architecture and Database Design**.

---

## 2. Architecture & Modular Monolith

The platform uses a **Modular Monolith** architecture:
- Frontend and backend live in a unified repository with independent build lifecycles and strict boundary separation.
- Backend modules follow a service-oriented structure: Routes, Controllers, Services, Repositories, Models, Middlewares, Schemas, and Types.
- 13 concrete MongoDB data models define the future data contracts.

For complete architectural specifications and Mermaid diagrams, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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
   npm run dev
   ```

3. **Run Frontend (Port 3000)**:
   ```bash
   cd frontend
   npm install
   npm test
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

### Option B: Docker Compose (All Services)

```bash
docker compose up --build -d
```
Services will be accessible at:
- Gateway (Nginx): `http://localhost:80`
- Frontend: `http://localhost:3000`
- Backend Health: `http://localhost:5000/api/v1/health`

---

## 5. Testing & Verification

### Backend Tests
Execute unit and integration tests across health, environment validation, database lifecycle, and Redis client handling:
```bash
cd backend
npm test
```
**Results**: 4 test suites passed, 13 tests passed.

### Frontend Tests
Execute UI and layout shell tests:
```bash
cd frontend
npm test
```
**Results**: 1 test suite passed, 4 tests passed.

---

## 6. Phase 1 Deliverables & Deferred Work

### Completed in Phase 1
- Repository and modular directory structure initialized.
- TypeScript strict configuration on frontend and backend.
- Express backend with Helmet, CORS, Morgan, centralized error handling, and Zod env validation.
- MongoDB database lifecycle and connection handling with 13 concrete data models.
- Redis connectivity client and health check service.
- Next.js 14 App Router frontend with Tailwind CSS enterprise CRM design system.
- Application shell with 10 required navigation items, status pills, and user profile.
- Real-time frontend-to-backend communication via TanStack Query.
- Multi-stage Dockerfiles and Docker Compose with Nginx reverse proxy.
- Comprehensive documentation (`ARCHITECTURE.md`, `DATABASE.md`, `API_DESIGN.md`, `DEVELOPMENT.md`).

### Intentionally Deferred to Phase 2 and Beyond
- **Phase 2**: JWT authentication, bcrypt password hashing, login/registration controllers, route protection middleware.
- **Phase 3**: Customer profile assembly, activity ingestion, deterministic segmentation engine.
- **Phase 4**: Campaign management, offer eligibility engine, billing reminder progression.
- **Phase 5**: LangGraph.js orchestration and multi-model GenAI integration (OpenAI, Gemini, Claude).
- **Phase 6**: Groundedness verification, safety guardrails, compliance checks, sensitive data detection.
- **Phase 7**: Interactive human-in-the-loop approval workflow and feedback capture.
- **Phase 8**: Controlled delivery, mock email dispatcher, and audit log explorer.
