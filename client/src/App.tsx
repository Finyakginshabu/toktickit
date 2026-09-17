import { useState, useEffect } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import AppHeader from "./components/AppHeader.js";
import CreateTicketForm from "./components/CreateTicketForm.js";
import MyTicketsList from "./components/MyTicketsList.js";
import RequesterTicketDetail from "./components/RequesterTicketDetail.js";
import StaffTicketQueue from "./components/StaffTicketQueue.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { checkSystem, Category } from "./api.js";

type SystemStatusState = "idle" | "loading" | "success" | "error";

export function SystemHealthWidget() {
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
  const { activeTab } = useRequester();

  return (
    <div className="container py-4">
      {activeTab === "my-tickets" && <MyTicketsList />}

      {activeTab === "ticket-queue" && <StaffTicketQueue />}

      {activeTab === "create-ticket" && <CreateTicketForm />}

      {activeTab === "ticket-detail" && <RequesterTicketDetail />}

      {activeTab === "user-management" && (
        <div className="zen-card p-4 text-center py-5">
          <span className="material-symbols-outlined fs-1 text-muted mb-2">manage_accounts</span>
          <h2 className="h5 fw-semibold mb-1">User Management</h2>
          <p className="text-muted small mb-0">
            Administrator user account management and initial password resets.
          </p>
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const { user, isLoading: authLoading } = useAuth();

  // Sync URL for auth-state-driven redirects (login / change-password)
  useEffect(() => {
    const isTest =
      (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") ||
      (typeof process !== "undefined" && process?.env?.NODE_ENV === "test");
    if (isTest) return;

    if (!authLoading) {
      if (!user && window.location.pathname !== "/login") {
        window.history.pushState({}, "", "/login");
      } else if (user?.mustChangePassword && window.location.pathname !== "/change-password") {
        window.history.pushState({}, "", "/change-password");
      }
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Mandatory password change check (BR-02)
  if (user && user.mustChangePassword) {
    return <ChangePassword />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      <AppHeader />
      <main className="flex-grow-1">
        <MainContent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppLayout />
      </RequesterProvider>
    </AuthProvider>
  );
}
