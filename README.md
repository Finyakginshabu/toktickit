# TokTickIT - IT Service Desk Application

TokTickIT is an internal IT service desk application developed for the CPE334 Software Engineering course. The application spans four lab milestones, progressively adding authentication, attachment handling, user administration, Actions Taken diagnostic logging, Resolution Gate enforcement, role-tailored dashboards, Zen Green design system styling, accessibility hardening, and multi-role Playwright end-to-end verification.

## Features

### Authentication and authorization

- Email/password login using bcrypt-hashed passwords and JWT bearer tokens.
- Generic login errors for invalid credentials and inactive accounts.
- Mandatory first-login password change with server-side `PASSWORD_CHANGE_REQUIRED` protection.
- Three single-role account types: `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
- Server-side ownership and role checks for every protected ticket, attachment, comment, note, and administration operation.
- Role-aware navigation and logout.

### Requester workflows

- Create and track tickets using the authenticated requester identity.
- Search, filter, sort, and paginate owned tickets.
- View ticket details and public comments.
- Upload up to five active attachments per ticket (`JPG`, `PNG`, `WEBP`, or `PDF`, maximum 5 MB each).
- Download active attachments and soft-remove attachments with an audit reason.
- Receive HTTP `410 Gone` when downloading a soft-removed attachment.
- Indicate that a ticket problem appears resolved without changing the formal ticket status.

### IT staff workflows

- Shared ticket queue across all requesters.
- Search, category/status/priority/owner filters, sorting, and pagination.
- Claim or reassign tickets to active IT staff or administrators.
- Update IT priority independently from requester priority.
- Advance tickets through the approved status transition matrix.
- Read and append public comments and internal notes.
- Log technical diagnostic actions taken on a ticket (description, action type, time spent).
- Attach multiple actions to a ticket and view the full action history.
- Resolve tickets only after at least one Action Taken entry is recorded (Resolution Gate).

### Administrator workflows

- Search and filter all user accounts by name, email, and role.
- Create users with one role, an initial password, and forced password change.
- Edit user name, email, role, and active status.
- Reset a user initial password.
- Protection against self-deactivation and deactivation or demotion of the last active administrator.

### Role-specific dashboards

- **Requester Dashboard**: Personal ticket summary with open/resolved counts and a recent-tickets list with drill-down links.
- **IT Staff Dashboard**: Operational metric cards (New, Open, In Progress, Waiting for Requester, My Assigned) with daily velocity deltas, unassigned and high-priority secondary indicators, and a recent-activity feed.
- **Administrator Dashboard**: Organisation-wide ticket metrics (all statuses), top-assignee workload ranking, and a user-administration quick-access panel.

### UI and responsive design

The application uses the Zen Green design system across desktop, tablet, and mobile layouts. Internal notes use a distinct restricted visual treatment, and status, priority, and role badges include explicit text labels. All dashboard metric cards link directly to the filtered ticket queue for drill-down navigation.

## Tech Stack

| Area | Technologies |
| :--- | :--- |
| Frontend | React 18, TypeScript, Vite, Bootstrap 5 |
| Backend | Node.js, Express, TypeScript, Multer |
| Database | PostgreSQL, Prisma ORM |
| Authentication | bcryptjs, JSON Web Tokens |
| Testing | Vitest, React Testing Library, Supertest, Playwright |

## Project Structure

```text
toktickit/
├── client/                         # React/Vite frontend
│   ├── src/components/             # Login, requester, staff, admin, and dashboard screens
│   ├── src/context/                # Authentication and requester state
│   ├── src/styles/                 # Zen Green theme
│   └── tests/                      # Lab 1–4 UI component tests
├── server/                         # Express/Prisma backend
│   ├── prisma/schema.prisma        # User, ticket, attachment, discussion, ActionTaken models
│   ├── prisma/seed.ts              # Deterministic test fixture seed (idempotent)
│   ├── src/middleware/             # Authentication and upload middleware
│   ├── src/routes/                 # Auth, staff, admin, and actions routes
│   └── tests/                      # API and unit tests
├── e2e/                            # Playwright browser workflows
│   ├── global-setup.ts             # Reseeds database before E2E runs
│   ├── lab-02/                     # Lab 2 regression workflows
│   ├── lab-03/                     # Authentication, staff, and admin workflows
│   └── lab-04/                     # Actions Taken, Resolution Gate, and dashboard workflows
├── docs/                           # Lab specifications, API contracts, and test plans
├── artifacts/                      # Screenshot evidence
├── playwright.config.ts
└── package.json                    # Root development and test commands
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- Docker with PostgreSQL support

### 1. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Start PostgreSQL

```bash
docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres
```

If the container already exists, start it with `docker start toktickit-db`.

### 3. Configure the server

```bash
copy server\.env.example server\.env
```

Set `server/.env` to point to PostgreSQL:

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
JWT_SECRET="replace-with-a-local-development-secret"
```

### 4. Migrate and seed the database

```bash
npm run prisma:migrate --prefix server
npm run prisma:seed --prefix server
```

The seed creates categories, related systems, users, demo tickets, attachments, public comments, internal notes, and Actions Taken entries. It is idempotent — it resets existing fixture data before recreating it. Do not run it against a database containing data you need to preserve.

### 5. Run the application

Start the API and client in separate terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

- Client: `http://localhost:5173`
- API: `http://localhost:3000`

## Seed Accounts

The seed uses these credentials for local testing:

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| Requester | `jennifer.anderson@kmutt.ac.th` | `Password123!` | Primary requester demo |
| Requester | `david.lee@kmutt.ac.th` | `Password123!` | Secondary requester |
| IT Staff | `staff.alice@toktickit.local` | `Password123!` | Primary staff demo |
| IT Staff | `staff.bob@toktickit.local` | `Password123!` | Secondary staff (Lab 4) |
| Administrator | `admin@toktickit.local` | `AdminPass123!` | Full admin access |
| First-login requester | `firstlogin@toktickit.local` | `InitialPassword123!` | `mustChangePassword = true` |

The first-login account is seeded with `mustChangePassword = true` to exercise the mandatory password-change flow. All other accounts are ready for normal test use.

## API Overview

All protected endpoints require `Authorization: Bearer <jwt-token>`. The server derives the current user and role from the token; clients cannot choose a requester identity through query parameters or form fields.

| Area | Endpoints |
| :--- | :--- |
| Authentication | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Reference data | `GET /api/categories`, `GET /api/related-systems` |
| Requester tickets | `POST /api/tickets`, `GET /api/tickets/my-tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/indicate-resolved` |
| Attachments | `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, `PATCH /api/attachments/:id/soft-remove` |
| Staff operations | `GET /api/staff/tickets`, `PATCH /api/tickets/:id/assignment`, `PATCH /api/tickets/:id/priority`, `PATCH /api/tickets/:id/status` |
| Discussions | `GET/POST /api/tickets/:id/comments`, `GET/POST /api/tickets/:id/notes` |
| Actions Taken | `GET /api/tickets/:id/actions`, `POST /api/tickets/:id/actions` |
| Dashboards | `GET /api/dashboard/requester`, `GET /api/dashboard/staff`, `GET /api/dashboard/admin` |
| Administration | `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password` |

## Testing

Run the server suite through the root command:

```bash
npm test
```

Other test commands:

```bash
npm run test:server                 # Server API and unit tests
npm run test:client                 # Client component tests
npm run test:all                    # Server, client, and all E2E suites
npm run test:e2e                    # Lab 3 Playwright workflows
npm run test:e2e:lab2               # Lab 2 regression workflows
npm run test:e2e:lab3               # Lab 3 Playwright workflows
npm run test:e2e:lab4               # Lab 4 Playwright workflows
npm run test:screenshots:lab4       # Lab 4 screenshot capture
npm run test:screenshots:lab3       # Lab 3 screenshot capture
npm run test:screenshots:lab2       # Lab 2 screenshot capture
```

The server test command reseeds the database before Vitest. Playwright global setup also reseeds before an E2E run, so running E2E followed by `npm test` starts the API suite from a clean fixture.

## Documentation

- [Lab 4 specification](docs/lab-04/specification.md)
- [Lab 4 REST API specification](docs/lab-04/api-spec.md)
- [Lab 4 UI specification](docs/lab-04/ui-spec.md)
- [Lab 4 test plan and traceability](docs/lab-04/tests.md)
- [Lab 3 specification](docs/lab-03/specification.md)
- [Lab 3 REST API specification](docs/lab-03/api-spec.md)
- [Lab 3 UI specification](docs/lab-03/ui-spec.md)
- [Lab 3 test plan and traceability](docs/lab-03/tests.md)
- [Lab 2 specification](docs/lab-02/specification.md)
- [Lab 2 REST API specification](docs/lab-02/api-spec.md)
- [Lab 2 UI specification](docs/lab-02/ui-spec.md)
- [Lab 2 test plan](docs/lab-02/tests.md)
