# TokTickIT - IT Service Desk Application

TokTickIT is an internal IT helpdesk request management system developed for the CPE334 Software Engineering course (Lab 01).

## Tech Stack

| Area | Technologies |
| :--- | :--- |
| **Frontend** | React + TypeScript + Vite + Bootstrap |
| **Backend** | Node.js + Express + TypeScript |
| **Database & ORM** | PostgreSQL + Prisma ORM |
| **Architecture** | REST-style APIs |
| **Testing** | Vitest and Supertest |

---

## Project Structure

```text
toktickit/
├── client/                 # React frontend application
│   ├── src/                # React components and API client
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   └── main.tsx
│   ├── tests/              # Frontend Vitest test files
│   │   └── lab-01/
│   │       └── App.test.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express backend application
│   ├── prisma/             # Prisma ORM configuration
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Idempotent seed script
│   ├── src/                # Express application routes & controllers
│   │   ├── app.ts
│   │   ├── index.ts
│   │   └── prisma.ts
│   ├── tests/              # Backend Supertest test files
│   │   └── lab-01/
│   │       ├── health.test.ts
│   │       └── categories.test.ts
│   ├── .env.example        # Environment variables template
│   └── package.json
├── docs/                   # Course documentation and lab notes
│   └── lab-01/
│       ├── ai_use.md       # AI use log and reflection
│       ├── reviewer.md     # Peer review record
│       ├── tests.md        # Test plan and evidence
│       └── fin.md          # Code implementation notes
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)
- Docker (for running PostgreSQL locally)

---

### Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd toktickit
   ```

2. Create environment configuration for the server:
   ```bash
   cp server/.env.example server/.env
   ```

3. Configure `server/.env` with your PostgreSQL database URL:
   ```env
   DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
   ```

---

### Database Setup (using Docker)

To run the PostgreSQL database using Docker:

1. Start the PostgreSQL container:
   ```bash
   docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres
   ```

2. Verify the container is running:
   ```bash
   docker ps
   ```

---

### Database Migration & Seeding

To initialize the database schema and seed it with the required categories:

1. Ensure the PostgreSQL container is running (see Database Setup section).
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Run the database migration:
   ```bash
   npx prisma migrate dev --name init_category_schema
   ```
   - This will create the necessary tables in the database based on your Prisma schema
   - `--name` specifies the name of the migration

4. Seed the database with categories:
   ```bash
   npx prisma db seed
   ```
   - This will run the `server/prisma/seed.ts` script
   - It will insert the four required IT request categories: "Account and Access", "Hardware", "Software", and "Network"

5. Verify the database contains the categories:
   ```bash
   npx prisma db seed --preview-feature-flags,
   ```

---

### Running the Application

#### Backend (`/server`)

```bash
cd server
npm run dev
```
The API server will run on `http://localhost:3000`.

#### Frontend (`/client`)

```bash
cd client
npm run dev
```
The React frontend application will run on `http://localhost:5173`.

---

## REST API Endpoints

| Method | Endpoint | Description | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service liveness probe | `200 OK` `{ "status": "ok", "service": "TokTickIT API" }` |
| `GET` | `/api/categories` | List IT request categories | `200 OK` `[ { "id": 1, "name": "Account and Access" }, ... ]` |

---

## Running Tests

- **Server Integration Tests (Supertest):**
  ```bash
  cd server
  npm test
  ```

- **Client UI Tests (Vitest):**
  ```bash
  cd client
  npm test
  ```
