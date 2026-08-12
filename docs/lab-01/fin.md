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
