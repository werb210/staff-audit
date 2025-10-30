import { api } from "@/lib/queryClient";
export const listUsers = () => api("/api/users");
export const createUser = (input) => api("/api/users", { method: "POST", body: JSON.stringify(input) });
