import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "staff" | "admin";

export type RoleProfile = {
  id: Role;
  label: string;
  initials: string;
  displayName: string;
  subtitle: string;
};

export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  staff: {
    id: "staff",
    label: "Clinical Staff",
    initials: "AR",
    displayName: "Dr. Anya Reeves",
    subtitle: "Internal medicine",
  },
  admin: {
    id: "admin",
    label: "Administrator",
    initials: "MK",
    displayName: "Morgan Kessler",
    subtitle: "Practice administration",
  },
};

type State = {
  role: Role;
  setRole: (role: Role) => void;
};

export const useRole = create<State>()(
  persist(
    (set) => ({
      role: "staff",
      setRole: (role) => set({ role }),
    }),
    { name: "ascertain-role" },
  ),
);

// UI-level permission gates. Frontend-only: a determined user with the
// browser devtools can flip the role or hit the API directly. This is a
// demo of role-aware UI, not enforcement. Real enforcement would live in
// the backend behind authentication.
export type Permission =
  | "patient:create"
  | "patient:edit"
  | "patient:delete"
  | "note:create"
  | "note:delete";

const PERMISSIONS: Record<Role, Set<Permission>> = {
  staff: new Set<Permission>(["note:create", "note:delete"]),
  admin: new Set<Permission>([
    "patient:create",
    "patient:edit",
    "patient:delete",
    "note:create",
    "note:delete",
  ]),
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].has(permission);
}

export function useCan(permission: Permission): boolean {
  const role = useRole((s) => s.role);
  return can(role, permission);
}
