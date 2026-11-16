# Developer Setup & Run Guide

## 1. Prerequisites

Ensure the following tools are installed on your workstation:
- **Node.js**: `v20.x` or higher (`v22.x` recommended)
- **npm**: `v10.x` or higher
- **MongoDB**: `v7.0+` (local service or via Docker)
- **Redis**: `v7.0+` (local service or via Docker)
- **Docker & Docker Compose**: (Optional for containerized execution)

---

## 2. Environment Configuration

1. In the repository root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Review the default environment variables:
   ```env
   NODE_ENV=development
   FRONTEND_PORT=3000
   BACKEND_PORT=5000
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   MONGODB_URI=mongodb://localhost:27017/customer_engagement_assistant
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=replace_with_secure_secret_min_32_characters_long
   JWT_EXPIRES_IN=1d
   ```

---

## 3. Local Installation & Development

### 3.1. Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Run backend in development mode (with hot-reload via `tsx`):
   ```bash
   npm run dev
   ```
   The backend API will start on `http://localhost:5000/api/v1`.

3. Run backend tests (Vitest):
   ```bash
   npm test
   ```

4. Build backend TypeScript:
   ```bash
   npm run build
   ```

### 3.2. Frontend Setup

1. Open a new terminal, navigate to the frontend directory, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run Next.js in development mode:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

3. Run frontend tests (Vitest + React Testing Library):
   ```bash
   npm test
   ```

4. Build frontend production assets:
   ```bash
   npm run build
   ```

---

## 4. Containerized Execution (Docker Compose)

To build and run all 5 services (Nginx, Frontend, Backend, MongoDB, Redis) via Docker:

```bash
# Build images and start all containers in detached mode
docker compose up --build -d

# Check status of running containers
docker compose ps

# View unified logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend

# Stop and remove containers
docker compose down

# Stop and remove containers including persistent database volumes
docker compose down -v
```

When running via Docker Compose:
- **Application Web Gateway (Nginx)**: `http://localhost:80/`
- **Frontend App**: `http://localhost:3000/`
- **Backend API**: `http://localhost:5000/api/v1`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
