import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

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

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success mb-3" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="text-muted">Loading system status…</p>
      )}

      {state === "success" && (
        <div className="mt-3">
          <p className="fw-bold">System Status: <span className="text-success">Online</span></p>
          {categories.length > 0 && (
            <div className="mt-3">
              <p className="fw-bold mb-2">Supported Request Categories:</p>
              <ol className="list-group list-group-numbered">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">{cat.name}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="mt-3">
          <p className="fw-bold">System Status: <span className="text-danger">Offline</span></p>
          <p className="text-danger mb-0">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
