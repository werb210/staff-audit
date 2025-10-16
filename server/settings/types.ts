export type Role = "admin" | "manager" | "ops" | "agent" | "read_only";

export type User = {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export type FeatureFlags = {
  pipelineDnD: boolean;
  commsCenter: boolean;
  lendersAdmin: boolean;
  strictAuth: boolean; // if true, non-admins can't access settings
};