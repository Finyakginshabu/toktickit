# TokTickIT

TokTickIT is an internal IT helpdesk request management system developed for the CPE334 Software Engineering course (Lab 01).

## Tech Stack

| Area | Technologies |
| :--- | :--- |
| **Frontend** | React + TypeScript + Vite + Bootstrap |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL + Prisma |
| **Architecture** | REST-style APIs |
| **Testing** | Vitest and Supertest in Lab 1 |

## Project Structure

```text
toktickit/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express backend application
│   ├── src/
│   │   └── app.ts          # Express application setup
│   ├── tests/              # Integration test suites
│   │   └── lab-01/
│   │       └── health.test.ts
│   ├── .env.example
│   └── package.json
├── docs/                   # Documentation files
│   └── lab-01/
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

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

### Installation and Setup

#### Backend Setup (`/server`)

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:3000`.

#### Frontend Setup (`/client`)

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend application will run on `http://localhost:5173`.

## Database Setup (using Docker)

To run the PostgreSQL database using Docker:

1. Ensure Docker is running on your system.
2. Run the following command to start the PostgreSQL container:
   ```bash
   docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres
   ```
   - This command creates a container named `toktickit-db`
   - Maps port 5432 on your host to port 5432 in the container
   - Runs the container in detached mode (`-d`)

3. Verify the database is running:
   ```bash
   docker ps
   ```

## Database Migration and Seeding

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
## Running Tests

To run the backend automated tests (including the health check test):

```bash
cd server
npm test
```
