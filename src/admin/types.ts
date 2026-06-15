export const ADMIN_ROLES = ["owner", "admin", "support", "reviewer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface CurrentAdminRoles {
  roles: AdminRole[];
  isOwner: boolean;
  isAdmin: boolean;
  canAccessAdmin: boolean;
}

export interface AdminResult<T> {
  data: T;
  error: string | null;
}
