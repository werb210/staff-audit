import { api } from "@/lib/queryClient";

export type CreateUserInput = {
  email: string;
  phone?: string;
  role: "user" | "marketing_admin" | "lender" | "referrer";
  name?: string;
};

export const listUsers = () => api<{ users: any[] }>("/api/users");
export const createUser = (input: CreateUserInput) =>
  api("/api/users", { method: "POST", body: JSON.stringify(input) });
