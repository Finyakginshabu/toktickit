import { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function AppHeader() {
  const { requester, openSelector, activeTab, setActiveTab } = useRequester();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: "my-tickets" | "create-ticket") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="zen-header py-2 px-3 mb-4">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        {/* Brand */}
        <div className="d-flex align-items-center me-3">
          <span className="fw-bold fs-5 tracking-tight me-2 text-white">TokTickIT</span>
          <span className="opacity-75 fs-6 fw-normal text-white d-none d-sm-inline">IT Service Desk</span>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="d-none d-md-flex align-items-center gap-2 flex-grow-1 ms-3">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "my-tickets" ? "zen-nav-link active" : "zen-nav-link"}`}
            onClick={() => handleNavClick("my-tickets")}
          >
            <span className="material-symbols-outlined fs-6 me-1">assignment</span>
            My Tickets
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "create-ticket" ? "zen-nav-link active" : "zen-nav-link"}`}
            onClick={() => handleNavClick("create-ticket")}
          >
            <span className="material-symbols-outlined fs-6 me-1">add_circle</span>
            Create Ticket
          </button>
        </nav>

        {/* Desktop Identity & Change Requester */}
        <div className="d-none d-md-flex align-items-center gap-3">
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

        {/* Mobile Hamburger Button */}
        <div className="d-flex d-md-none align-items-center">
          <button
            type="button"
            className="btn btn-sm zen-nav-toggle text-white d-flex align-items-center justify-content-center"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined fs-4">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="zen-mobile-menu d-md-none mt-2 pt-2">
          <div className="d-flex flex-column gap-2">
            <button
              type="button"
              className={`zen-mobile-nav-link ${activeTab === "my-tickets" ? "active" : ""}`}
              onClick={() => handleNavClick("my-tickets")}
            >
              <span className="material-symbols-outlined me-2">assignment</span>
              My Tickets
            </button>
            <button
              type="button"
              className={`zen-mobile-nav-link ${activeTab === "create-ticket" ? "active" : ""}`}
              onClick={() => handleNavClick("create-ticket")}
            >
              <span className="material-symbols-outlined me-2">add_circle</span>
              Create Ticket
            </button>

            {/* Requester Profile Box in Mobile Drawer */}
            <div className="zen-mobile-requester-box mt-2">
              {requester ? (
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold text-white">{requester.name}</div>
                    <small className="text-white-50">{requester.department || requester.email}</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openSelector();
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-light text-success fw-bold w-100"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openSelector();
                  }}
                >
                  Select Requester
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
