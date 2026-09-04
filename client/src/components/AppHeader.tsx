import { useRequester } from "../context/RequesterContext.js";

export default function AppHeader() {
  const { requester, openSelector, activeTab, setActiveTab } = useRequester();

  return (
    <header className="zen-header py-2 px-3 mb-4">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between">
        {/* Brand */}
        <div className="d-flex align-items-center me-4">
          <span className="fw-bold fs-5 tracking-tight me-3">
            TokTickIT <span className="opacity-75 fs-6 fw-normal">IT Service Desk</span>
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="d-flex align-items-center gap-2 flex-grow-1">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "my-tickets" ? "zen-nav-link active" : "zen-nav-link"}`}
            onClick={() => setActiveTab("my-tickets")}
          >
            <span className="material-symbols-outlined fs-6 me-1">assignment</span>
            My Tickets
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "create-ticket" ? "zen-nav-link active" : "zen-nav-link"}`}
            onClick={() => setActiveTab("create-ticket")}
          >
            <span className="material-symbols-outlined fs-6 me-1">add_circle</span>
            Create Ticket
          </button>
        </nav>

        {/* Identity & Change Requester */}
        <div className="d-flex align-items-center gap-3 mt-2 mt-md-0">
          {requester ? (
            <div className="d-flex align-items-center gap-2">
              <div className="text-end lh-sm">
                <div className="fw-semibold text-white">{requester.name}</div>
                {requester.department && (
                  <small className="text-white-50">{requester.department}</small>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light ms-1"
                onClick={openSelector}
                aria-label="Change Requester"
              >
                Change Requester
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-light text-success fw-bold"
              onClick={openSelector}
            >
              Select Requester
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
