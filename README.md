# TokTickIT - IT Service Desk Application

TokTickIT is an internal IT helpdesk request management system developed for the CPE334 Software Engineering course.

**Lab 02 Deliverable**: Requester Ticketing MVP — complete self-service portal for Requesters featuring multi-user isolation, ticket submission with file attachments, searchable & paginated ticket lists, and full attachment lifecycle management with soft-removal.

---

## Features (Lab 02 MVP)

* **Development Requester Context**: Testing-only selector for switching between active Requester accounts (Jennifer Anderson, David Lee, Michael Brown) with session persistence in `localStorage`.
* **Create IT Support Ticket**:
  * Category & dynamic Related System dropdown selection.
  * Priority chips (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * Real-time character counters (Summary: 5–100 chars, Description: 10–2000 chars).
  * Drag-and-drop file attachment dropzone (JPG, PNG, WEBP, PDF up to 5 MB per file, max 5 active attachments).
  * Form preservation on backend error and duplicate submission guard.
* **My Tickets Dashboard**:
  * Strict multi-user ownership isolation (users only see their own tickets).
  * Real-time text search (ticket number, summary).
  * Filters for Category, Priority, and Status with clear-filters action.
  * Sortable columns with direction indicators.
  * Configurable pagination (5, 10, 25, 50 items per page).
  * Responsive layout: full data table on desktop, stacked card view on mobile (<768px).
* **Ticket Detail & Attachment Lifecycle**:
  * Read-only ticket header with Zen Green soft ivory styling.
  * Add additional attachments to existing tickets (enforcing 5-active-file cap).
  * File download for active attachments.
  * Audited soft-removal modal with required removal reason (3–255 characters).
  * Download-blocked state (HTTP 410 Gone) for soft-removed attachments.
* **Zen Green Design System**: Consistent palette (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`) and Google Material Symbols Outlined across all viewports.

---

## Tech Stack

| Area | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5, Zen Green Tokens, Material Symbols |
| **Backend** | Node.js, Express, TypeScript, Multer (file upload handling) |
| **Database & ORM** | PostgreSQL (Docker), Prisma ORM |
| **Testing** | Vitest, React Testing Library, Supertest, Playwright (E2E & Screenshots) |
| **Architecture** | Spec-Driven Development (Spec DD) & Test-Driven Development (Test DD) |

---

## Project Structure

```text
toktickit/
├── docs/                           # Engineering specifications & course records
│   ├── lab-01/                     # Lab 1 documentation
│   └── lab-02/                     # Lab 2 specification & delivery docs (Labsheet §12)
│       ├── specification.md        # Product specification, FRs, BRs, ACs, and DoD
│       ├── tests.md                # Test plan, traceability matrix & results
│       ├── ui-spec.md              # UI design spec, tokens & screenshot checklist
│       ├── api-spec.md             # REST API contract & JSON schemas
│       ├── reviewer.md             # Peer review record & PR log
│       └── ai-use.md               # AI prompt reflections & engineering log
├── server/                         # Express backend application
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma data models & enums
│   │   ├── seed.ts                 # Idempotent seed data (categories, systems, users, tickets)
│   │   └── migrations/             # Version-controlled migrations
│   ├── src/
│   │   ├── middleware/             # Multer attachment upload middleware
│   │   ├── utils/                  # Ticket number sequence generator
│   │   ├── app.ts                  # Express routes, controllers & error handling
│   │   ├── index.ts                # Server entry point (binds to 0.0.0.0:3000)
│   │   └── prisma.ts               # Prisma client singleton
│   ├── tests/                      # Backend Supertest test files
│   │   ├── lab-01/                 # Lab 1 API tests (health, categories)
│   │   └── lab-02/                 # Lab 2 API tests (Labsheet §12)
│   │       ├── create-ticket.api.test.ts
│   │       ├── my-tickets.api.test.ts
│   │       ├── ticket-detail.api.test.ts
│   │       └── attachments.api.test.ts
│   ├── uploads/                    # Local attachment storage (gitignored)
│   ├── .env.example
│   └── package.json
├── client/                         # React frontend application
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── AppHeader.tsx
│   │   │   ├── CreateTicketForm.tsx
│   │   │   ├── MyTicketsList.tsx
│   │   │   ├── RequesterTicketDetail.tsx
│   │   │   ├── AttachmentSection.tsx
│   │   │   └── RequesterSelectorModal.tsx
│   │   ├── context/                # React Context (RequesterContext)
│   │   ├── styles/                 # Zen Green theme & Bootstrap overrides
│   │   ├── types/                  # Shared TypeScript definitions
│   │   ├── api.ts                  # Fetch API client with LAN proxy support
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/                      # Frontend Vitest test files
│   │   ├── lab-01/                 # Lab 1 UI tests
│   │   └── lab-02/                 # Lab 2 UI & component tests (Labsheet §12)
│   │       ├── CreateTicket.test.tsx
│   │       ├── MyTickets.test.tsx
│   │       ├── RequesterTicketDetail.test.tsx
│   │       └── AttachmentSection.test.tsx
│   ├── package.json
│   └── vite.config.ts              # Vite configuration (0.0.0.0 host & /api proxy)
├── e2e/                            # Playwright End-to-End test suites (Labsheet §12)
│   └── lab-02/
│       ├── requester-ticket-flow.spec.ts   # E2E-01, E2E-02, E2E-03 journeys
│       └── capture-screenshots.spec.ts     # Visual evidence capture (18 screenshots)
├── artifacts/                      # Course submission evidence
│   └── lab-02/screenshots/         # Captured responsive screenshots (Labsheet §12)
│       ├── create-ticket/          # 6 Create Ticket flow screenshots
│       ├── my-tickets/             # 7 My Tickets dashboard screenshots
│       └── ticket-detail/          # 5 Ticket Detail & Attachment screenshots
├── playwright.config.ts            # Playwright E2E configuration
├── package.json                    # Root test scripts
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Docker**: For running PostgreSQL locally

---

### 1. Database Setup (Docker)

Start the PostgreSQL container:

```bash
docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres
```

Verify the database container is running:
```bash
docker ps
```

---

### 2. Environment Configuration

Copy the server environment template:
```bash
cp server/.env.example server/.env
```

Ensure `server/.env` contains your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

---

### 3. Database Migration & Seeding

Navigate to the `server/` directory:
```bash
cd server
```

Apply database migrations:
```bash
npx prisma migrate dev
```

Seed initial reference data, test requesters, and demo tickets:
```bash
npx prisma db seed
```

---

### 4. Running the Application

You can run both services concurrently from the root directory or in separate terminals:

#### Start Backend API (`server/`)
```bash
npm run dev --prefix server
```
* API listening on: `http://localhost:3000` (and on local network `http://0.0.0.0:3000`)

#### Start Frontend Client (`client/`)
```bash
npm run dev --prefix client
```
* Frontend running on: `http://localhost:5173`
* Accessible across local Wi-Fi / LAN via `http://<YOUR_LOCAL_IP>:5173` (e.g., test on mobile phone or tablet).

---

## REST API Reference (Lab 02)

| Method | Endpoint | Description | Auth / Scope |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health & service liveness probe | Public |
| `GET` | `/api/categories` | List active IT request categories | Public |
| `GET` | `/api/related-systems` | List active Related Systems (devices/services) | Public |
| `GET` | `/api/requesters` | List active Development Requesters (`isActive=true`) | Public / Dev Context |
| `POST` | `/api/tickets` | Submit new ticket with optional multipart file uploads | Requester (`requesterId`) |
| `GET` | `/api/tickets` | List paginated tickets with search, filters, and sort | Requester (`requesterId` scoped) |
| `GET` | `/api/tickets/:id` | Retrieve single ticket detail and attachment metadata | Owner Requester only (403 if cross-access) |
| `POST` | `/api/tickets/:id/attachments` | Upload additional attachment to existing ticket (max 5 active) | Owner Requester only |
| `GET` | `/api/attachments/:id/download` | Stream attachment binary file (`410 Gone` if removed) | Owner Requester only |
| `PATCH` | `/api/attachments/:id/soft-remove` | Soft-remove attachment with audit reason (>= 3 chars) | Owner Requester only |

---

## Running Automated Tests

TokTickIT enforces a 100% green test suite across all layers:

### Run All Tests
```bash
npm run test:all
```

### Run Server Tests (Vitest + Supertest)
```bash
npm run test:server
# or from server directory:
cd server && npm test
```
*Runs 25 server integration tests verifying endpoints, boundary checks, attachment limits, and requester isolation.*

### Run Client Tests (Vitest + React Testing Library)
```bash
npm run test:client
# or from client directory:
cd client && npm test
```
*Runs 22 component tests verifying validation, character counters, dropzone limits, and state switching.*

### Run Playwright End-to-End Tests
```bash
npm run test:e2e
```
*Executes full browser journeys (`E2E-01` Create & View, `E2E-02` Multi-user Isolation, `E2E-03` Attachment Lifecycle with Download).*

### Capture Visual Verification Screenshots
```bash
npm run test:e2e:screenshots
```
*Captures all 18 required responsive screenshots into `artifacts/lab-02/screenshots/` across Desktop, Tablet, and Mobile viewports.*

---

## Documentation

* **Engineering Specifications**: [`docs/lab-02/specification.md`](docs/lab-02/specification.md)
* **REST API Contract**: [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md)
* **UI Design Specification**: [`docs/lab-02/ui-spec.md`](docs/lab-02/ui-spec.md)
* **Test Plan & Traceability Matrix**: [`docs/lab-02/tests.md`](docs/lab-02/tests.md)
* **Peer Review Record**: [`docs/lab-02/reviewer.md`](docs/lab-02/reviewer.md)
* **AI Usage & Prompts Reflection**: [`docs/lab-02/ai-use.md`](docs/lab-02/ai-use.md)
