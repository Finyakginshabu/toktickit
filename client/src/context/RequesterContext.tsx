import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext.js";
import { RequesterUser, AppTab } from "../types/index.js";

interface RequesterContextType {
  requester: RequesterUser | null;
  activeTab: AppTab;
  selectedTicketId: number | null;
  setActiveTab: (tab: AppTab, ticketId?: number | null) => void;
  setSelectedTicketId: (id: number | null) => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: React.ReactNode }) {
  const { user, activeTab, selectedTicketId, setActiveTab, setSelectedTicketId } = useAuth();

  const requester: RequesterUser | null = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        department: (user as any).department,
        isActive: true,
      }
    : null;

  return (
    <RequesterContext.Provider
      value={{
        requester,
        activeTab,
        selectedTicketId,
        setActiveTab,
        setSelectedTicketId,
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
