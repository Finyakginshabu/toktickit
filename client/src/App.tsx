import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import AppHeader from "./components/AppHeader.js";
import RequesterSelectorModal from "./components/RequesterSelectorModal.js";
import { checkSystem, Category } from "./api.js";

type SystemStatusState = "idle" | "loading" | "success" | "error";

function SystemHealthWidget() {
  const [statusState, setStatusState] = useState<SystemStatusState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleCheck() {
    setStatusState("loading");
    setErrorMsg("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setStatusState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to connect to TokTickIT API");
      setStatusState("error");
    }
  }

  return (
    <div className="zen-card p-3 mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h6 fw-bold mb-0">System Health & Reference Status</h2>
        <button
          className="btn btn-sm btn-zen-secondary"
          onClick={handleCheck}
          disabled={statusState === "loading"}
        >
          {statusState === "loading" ? "Loading…" : "Check System"}
        </button>
      </div>

      {statusState === "loading" && (
        <p className="text-muted small mb-0">Loading system status…</p>
      )}

      {statusState === "success" && (
        <div className="small mt-2">
          <p className="fw-semibold mb-1">
            System Status: <span className="text-success">Online</span>
          </p>
          {categories.length > 0 && (
            <div>
              <p className="text-muted mb-1">Supported Request Categories:</p>
              <ul className="list-group list-group-flush border rounded">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item py-1 px-2 small">
                    {cat.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {statusState === "error" && (
        <div className="small mt-2">
          <p className="fw-semibold text-danger mb-1">
            System Status: <span>Offline</span>
          </p>
          <p className="text-danger mb-0">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

function MainContent() {
  const { requester, activeTab } = useRequester();

  return (
    <div className="container py-4">
      {activeTab === "my-tickets" && (
        <div className="zen-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="h4 fw-bold mb-1">My Tickets</h1>
              <p className="text-muted mb-0">
                Viewing support requests for{" "}
                <strong className="text-dark">{requester?.name ?? "Guest"}</strong>
              </p>
            </div>
          </div>
          <div className="zen-callout-info">
            <strong>Ready for Issue 5:</strong> My Tickets dashboard with search, filtering, and pagination will be connected in Issue 5.
          </div>
          <SystemHealthWidget />
        </div>
      )}

      {activeTab === "create-ticket" && (
        <div className="zen-card p-4">
          <h1 className="h4 fw-bold mb-1">Create IT Support Ticket</h1>
          <p className="text-muted mb-3">
            Submitting as <strong className="text-dark">{requester?.name ?? "Guest"}</strong>
          </p>
          <div className="zen-callout-info">
            <strong>Ready for Issue 4:</strong> Create Ticket form with file attachments and validation will be connected in Issue 4.
          </div>
          <SystemHealthWidget />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <div className="min-vh-100 d-flex flex-column">
        <AppHeader />
        <main className="flex-grow-1">
          <MainContent />
        </main>
        <RequesterSelectorModal />
      </div>
    </RequesterProvider>
  );
}
