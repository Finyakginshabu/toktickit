import { RequesterUser, Category, RelatedSystem, Ticket } from "./types/index.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export * from "./types/index.js";

// Lab 1 System status check
export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!healthRes.ok) {
    throw new Error(`Unable to connect to TokTickIT API (Status: ${healthRes.status})`);
  }

  const categories = await getCategories();
  return { online: true, categories };
}

// Lab 2 Reference Data APIs
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch categories (Status: ${res.status})`);
  }

  return res.json();
}

export async function getRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch development requesters (Status: ${res.status})`);
  }

  return res.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch related systems (Status: ${res.status})`);
  }

  return res.json();
}

// Lab 2 Ticket Creation API
export async function createTicket(formData: FormData): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    body: formData,
  }).catch(() => {
    throw new Error("Unable to connect to TokTickIT API");
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? `Server returned status ${res.status}`;
    const error = new Error(message);
    (error as any).details = errorJson?.error?.details;
    (error as any).code = errorJson?.error?.code;
    throw error;
  }

  return res.json();
}
