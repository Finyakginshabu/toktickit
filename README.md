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

## Running Tests

To run the backend automated tests (including the health check test):

```bash
cd server
npm test
```
