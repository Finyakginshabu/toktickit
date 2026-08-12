# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASS |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | PASS |
| 3 | Vitest | Heading renders | PASS |
| 4 | Vitest | Success state shows Online + category list | PASS |
| 5 | Vitest | Error state shows Offline + message | PASS |

### Test Execution Summary

#### Server Tests (`server/tests/lab-01/`)
- `health.test.ts`: Passed (HTTP 200 `{ status: "ok", service: "TokTickIT API" }`)
- `categories.test.ts`: Passed (HTTP 200 with 4 seeded categories ordered by ID)

#### Client Tests (`client/tests/lab-01/`)
- `App.test.tsx`: Passed
  - `renders the TokTickIT heading`
  - `shows Online and the seeded categories on success`
  - `shows an Offline error message when the API is unavailable`
