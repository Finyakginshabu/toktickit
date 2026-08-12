# Lab 1 — Implementation Notes (fin.md)

This file records what was done for each issue, which files were changed, and what each piece of code does in the project.

---

## Issue 2 — API Health Check

**Branch:** `feature/2-health-check`

### What was implemented

#### 1. `server/src/app.ts` — `GET /api/health` route

```ts
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});
```

**What it does:**  
This Express endpoint responds to HTTP `GET /api/health` requests with status `200 OK` and a JSON body `{ status: "ok", service: "TokTickIT API" }`. It serves as a backend liveness probe for the client and Supertest automated unit/integration tests without touching the database.

---

#### 2. `client/src/api.ts` — `checkSystem()` function

```ts
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!healthRes.ok) {
    throw new Error(`Unable to connect to TokTickIT API (Status: ${healthRes.status})`);
  }

  return { online: true, categories: [] };
}
```

**What it does:**  
`checkSystem()` is the API layer function that performs the network request to `${API_URL}/api/health`. If the server is unreachable or returns a non-2xx status code, it catches the network exception/failure and throws a descriptive error (`"Unable to connect to TokTickIT API"`). On success, it returns `{ online: true, categories: [] }`.

---

#### 3. `client/src/App.tsx` — React UI State Machine & Layout

```tsx
async function handleCheck() {
  setState("loading");
  setErrorMsg("");
  try {
    const result = await checkSystem();
    setCategories(result.categories);
    setState("success");
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : "Unable to connect to TokTickIT API");
    setState("error");
  }
}
```

**What it does:**  
Manages four explicit UI states:
- `idle`: Initial view showing the `[Check System]` button.
- `loading`: Shows `Loading…` state on the button and displays a loading message while waiting for network response.
- `success`: Renders `System Status: Online` with green styling once backend returns 200 OK.
- `error`: Renders `System Status: Offline` with red styling and displays the helpful error message (`Unable to connect to TokTickIT API`) if the backend is down.

---

### Files Changed

| File | Change |
|------|--------|
| [`server/src/app.ts`](file:///c:/DATA/CPE/CPE334/toktickit/server/src/app.ts) | Replaced stub response with HTTP 200 `{ status: "ok", service: "TokTickIT API" }` |
| [`client/src/api.ts`](file:///c:/DATA/CPE/CPE334/toktickit/client/src/api.ts) | Implemented `checkSystem()` fetch logic and error throwing for health endpoint |
| [`client/src/App.tsx`](file:///c:/DATA/CPE/CPE334/toktickit/client/src/App.tsx) | Implemented `handleCheck` handler, `errorMsg` state, and matching UI render blocks |
| [`docs/lab-01/fin.md`](file:///c:/DATA/CPE/CPE334/toktickit/docs/lab-01/fin.md) | Created/Updated documentation explaining changed code and architecture |

---

### Acceptance Criteria Verification

- ✅ `GET /api/health` returns HTTP 200 with `{ status: "ok", service: "TokTickIT API" }`.
- ✅ Supertest test in `server/tests/lab-01/health.test.ts` validates the endpoint.
- ✅ Frontend `checkSystem()` calls real backend API.
- ✅ React UI renders `System Status: Online` on success and `System Status: Offline` with a clear error message on API failure.

---

## Issue 3 — Create and Seed IT Request Categories

**Branch:** `feature/3-category-seed` (or `feature/3-category-schema`)

### What was implemented

#### 1. `server/prisma/schema.prisma` — Category Data Model

```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
}
```

**What it does:**  
Defines the database table structure for IT request categories using Prisma schema definition:
- `id`: Auto-incrementing integer primary key uniquely identifying each category.
- `name`: Unique string representing the category title (e.g., "Account and Access", "Hardware", "Software", "Network"). The `@unique` constraint prevents duplicate category names and allows `upsert` queries by `name`.
- `createdAt`: Timestamp defaulting to current server time when the row is inserted.

---

#### 2. `server/prisma/seed.ts` — Idempotent Database Seeding Script

```ts
async function main() {
  const prisma = getPrisma();
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded 4 request categories successfully.");
}
```

**What it does:**  
Provides a seed script that populates the 4 core IT request categories required by the stakeholder contract. Using Prisma's `upsert` method:
- If a category with the specified `name` does not exist, it executes `create: { name }` to insert it.
- If it already exists, `update: {}` makes no changes.
- **Result:** Running `npm run prisma:seed` or `npx prisma db seed` multiple times is safe (idempotent) and will never create duplicate entries or cause unique key constraint errors.

---

#### 3. Database Credentials Security (`.gitignore`)

```gitignore
# env & secrets
.env
*.env
!.env.example
```

**What it does:**  
Ensures sensitive database connection strings (`DATABASE_URL`) stored in `server/.env` remain strictly local and are never committed to version control. Only the template file `.env.example` is tracked.

---

#### 4. Documentation & Setup Guide (`README.md`)

**What it does:**  
Updated [`README.md`](file:///c:/DATA/CPE/CPE334/toktickit/README.md) with clear and comprehensive project documentation:
- Project structure overview highlighting client, server, and docs directories.
- Database setup instructions using Docker for PostgreSQL.
- Database migration commands (`npx prisma migrate dev --name init_category_schema`).
- Seeding commands (`npx prisma db seed`).
- Inspection commands via Prisma Studio GUI (`npx prisma studio`).
- Frontend and backend development server launch instructions.
- Unit and integration testing commands for both client and server.

---

### Files Changed

| File | Change |
|------|--------|
| [`server/prisma/schema.prisma`](file:///c:/DATA/CPE/CPE334/toktickit/server/prisma/schema.prisma) | Added `Category` model with `id`, unique `name`, and `createdAt` fields |
| [`server/prisma/seed.ts`](file:///c:/DATA/CPE/CPE334/toktickit/server/prisma/seed.ts) | Implemented `main()` using `prisma.category.upsert` for idempotent category seeding |
| [`README.md`](file:///c:/DATA/CPE/CPE334/toktickit/README.md) | Updated README with detailed environment setup, Docker PostgreSQL instructions, Prisma migration & seeding commands, and test instructions |
| [`docs/lab-01/fin.md`](file:///c:/DATA/CPE/CPE334/toktickit/docs/lab-01/fin.md) | Documented Issue 3 implementation, code explanation, README updates, and security configuration |

---

### Acceptance Criteria Verification

- ✅ **Prisma Category model exists** with `id` (autoincrement), unique `name`, and `createdAt`.
- ✅ **Migration command executed**: Successfully migrated PostgreSQL database with `npx prisma migrate dev --name init_category_schema`.
- ✅ **Seed populates four required categories**: `"Account and Access"`, `"Hardware"`, `"Software"`, and `"Network"`.
- ✅ **Idempotent seed execution**: `upsert()` guarantees running the seed script multiple times does not produce duplicate rows.
- ✅ **Credentials secured**: `.env` files containing `DATABASE_URL` are ignored in `.gitignore`.
- ✅ **README updated**: Comprehensive documentation for local setup, Docker DB, Prisma migrations, seeding, running dev servers, and tests.

---

## Issue 4 — Display the IT Request Category List

**Branch:** `feature/4-category-list`

### What was implemented

#### 1. `server/src/app.ts` — `GET /api/categories` Endpoint

```ts
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});
```

**What it does:**  
Adds an Express REST endpoint at `GET /api/categories` that queries the PostgreSQL database via Prisma ORM (`prisma.category.findMany`).
- Orders categories deterministically by `id` ascending.
- Selects only necessary fields (`id` and `name`).
- Responds with `200 OK` and a JSON array of categories.
- Catches database or internal errors and responds with HTTP `500 Internal Server Error` with a safe generic error message.

---

#### 2. `client/src/api.ts` — Updated `checkSystem()` API Client

```ts
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!healthRes.ok) {
    throw new Error(`Unable to connect to TokTickIT API (Status: ${healthRes.status})`);
  }

  const catRes = await fetch(`${API_URL}/api/categories`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!catRes.ok) {
    throw new Error(`Unable to fetch categories (Status: ${catRes.status})`);
  }

  const categories: Category[] = await catRes.json();
  return { online: true, categories };
}
```

**What it does:**  
Sequentially checks backend health (`/api/health`) and fetches the list of request categories (`/api/categories`).
- Throws clear human-readable error messages if network calls fail or return non-2xx status codes.
- Returns `{ online: true, categories }` on success.

---

#### 3. `client/src/App.tsx` — React UI List Rendering & State Management

**What it does:**  
Renders the real categories array returned by `checkSystem()` dynamically rather than using hard-coded values. Maintains state transitions:
- `idle`: Initial state before button click.
- `loading`: Displays loading text while network requests are in-flight.
- `success`: Renders `System Status: Online` and displays the numbered list of categories loaded from PostgreSQL.
- `error`: Renders `System Status: Offline` and displays the error message.

---

#### 4. Automated Tests (`server/tests/lab-01/categories.test.ts` & `client/tests/lab-01/App.test.tsx`)

- **Server Test (`categories.test.ts`):** Supertest integration test asserting `GET /api/categories` returns HTTP 200 and the four seeded categories in `id` order (`Account and Access`, `Hardware`, `Software`, `Network`).
- **Client Test (`App.test.tsx`):** Vitest UI tests mocking `api.checkSystem()` to verify:
  1. Header rendering.
  2. Success state rendering **Online** badge and category items.
  3. Error state rendering **Offline** badge and error message when `checkSystem()` throws.

---

### Files Changed

| File | Change |
|------|--------|
| [`server/src/app.ts`](file:///c:/DATA/CPE/CPE334/toktickit/server/src/app.ts) | Implemented `GET /api/categories` route with Prisma query ordered by ID |
| [`client/src/api.ts`](file:///c:/DATA/CPE/CPE334/toktickit/client/src/api.ts) | Updated `checkSystem()` to fetch categories from backend endpoint |
| [`client/src/App.tsx`](file:///c:/DATA/CPE/CPE334/toktickit/client/src/App.tsx) | Updated React component to dynamically render backend categories and UI states |
| [`server/tests/lab-01/categories.test.ts`](file:///c:/DATA/CPE/CPE334/toktickit/server/tests/lab-01/categories.test.ts) | Added Supertest integration test for `/api/categories` endpoint |
| [`client/tests/lab-01/App.test.tsx`](file:///c:/DATA/CPE/CPE334/toktickit/client/tests/lab-01/App.test.tsx) | Added Vitest component tests verifying Online + category list success state and Offline error state |
| [`docs/lab-01/tests.md`](file:///c:/DATA/CPE/CPE334/toktickit/docs/lab-01/tests.md) | Documented test evidence and PASS results for all 5 tests |
| [`docs/lab-01/fin.md`](file:///c:/DATA/CPE/CPE334/toktickit/docs/lab-01/fin.md) | Updated implementation notes with Issue 4 code details and acceptance criteria verification |

---

### Acceptance Criteria Verification

- ✅ **GET /api/categories retrieves categories from PostgreSQL through Prisma** ordered by `id`.
- ✅ **Returns category ID and name in predictable order** (`Account and Access`, `Hardware`, `Software`, `Network`).
- ✅ **Supertest test verifies the response** in `server/tests/lab-01/categories.test.ts`.
- ✅ **React displays categories returned by the API** dynamically.
- ✅ **Loading and error states shown** in UI.
- ✅ **Vitest test verifies UI behavior** in `client/tests/lab-01/App.test.tsx`.
