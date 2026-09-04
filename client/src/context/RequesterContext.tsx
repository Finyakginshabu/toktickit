import React, { createContext, useContext, useState, useEffect } from "react";
import { RequesterUser } from "../types/index.js";
import { getRequesters } from "../api.js";

interface RequesterContextType {
  requester: RequesterUser | null;
  availableRequesters: RequesterUser[];
  loadingRequesters: boolean;
  requesterError: string | null;
  isSelectorOpen: boolean;
  activeTab: "my-tickets" | "create-ticket" | "ticket-detail";
  selectedTicketId: number | null;
  setRequester: (req: RequesterUser | null) => void;
  openSelector: () => void;
  closeSelector: () => void;
  setActiveTab: (tab: "my-tickets" | "create-ticket" | "ticket-detail") => void;
  setSelectedTicketId: (id: number | null) => void;
  refreshRequesters: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "toktickit_dev_requester_id";

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: React.ReactNode }) {
  const [requester, setRequesterState] = useState<RequesterUser | null>(null);
  const [availableRequesters, setAvailableRequesters] = useState<RequesterUser[]>([]);
  const [loadingRequesters, setLoadingRequesters] = useState<boolean>(true);
  const [requesterError, setRequesterError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"my-tickets" | "create-ticket" | "ticket-detail">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);


  async function refreshRequesters() {
    setLoadingRequesters(true);
    setRequesterError(null);
    try {
      const users = await getRequesters();
      setAvailableRequesters(users);

      // Restore persisted selection if exists and still valid
      const storedId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedId) {
        const found = users.find((u) => u.id === Number(storedId));
        if (found) {
          setRequesterState(found);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setIsSelectorOpen(true);
        }
      } else {
        setIsSelectorOpen(true);
      }
    } catch (err) {
      setRequesterError(err instanceof Error ? err.message : "Failed to load requesters");
      setIsSelectorOpen(true);
    } finally {
      setLoadingRequesters(false);
    }
  }

  useEffect(() => {
    refreshRequesters();
  }, []);

  function setRequester(req: RequesterUser | null) {
    setRequesterState(req);
    setSelectedTicketId(null);
    if (activeTab === "ticket-detail") {
      setActiveTab("my-tickets");
    }
    if (req) {
      localStorage.setItem(LOCAL_STORAGE_KEY, String(req.id));
      setIsSelectorOpen(false);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setIsSelectorOpen(true);
    }
  }

  function openSelector() {
    setIsSelectorOpen(true);
  }

  function closeSelector() {
    if (requester) {
      setIsSelectorOpen(false);
    }
  }

  return (
    <RequesterContext.Provider
      value={{
        requester,
        availableRequesters,
        loadingRequesters,
        requesterError,
        isSelectorOpen,
        activeTab,
        selectedTicketId,
        setRequester,
        openSelector,
        closeSelector,
        setActiveTab,
        setSelectedTicketId,
        refreshRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
