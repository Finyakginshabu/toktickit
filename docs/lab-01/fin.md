# Lab 1 — Implementation Notes (fin.md)

This file records what was done for each issue, which files were changed, and what each piece of code does in the project.

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
