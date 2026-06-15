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

export interface AdminOverviewUsersMetrics {
  total: number;
  new7d: number;
  new30d: number;
}

export interface AdminOverviewProfileMetrics {
  total: number;
  completed: number;
  withUploadedAvatar: number;
}

export interface AdminOverviewRoleMetrics {
  owners: number;
  admins: number;
  support: number;
  reviewers: number;
}

export interface AdminOverviewEventMetrics {
  adminAudit24h: number;
  adminAudit7d: number;
  security24h: number;
  security7d: number;
  rateLimit24h: number;
  rateLimit7d: number;
}

export interface AdminOverviewCloudRowsMetrics {
  projects: number;
  scenes: number;
  sceneAssets: number;
}

export interface AdminOverviewStorageMetrics {
  avatars: number | null;
  referenceImages: number | null;
}

export interface AdminOverviewCapabilityFlags {
  cloudSyncEnabled: boolean;
}

export interface AdminOverviewMetrics extends AdminOverviewCapabilityFlags {
  generatedAt: string;
  sourceVersion: "phase-e1";
  users: AdminOverviewUsersMetrics;
  profiles: AdminOverviewProfileMetrics;
  roles: AdminOverviewRoleMetrics;
  events: AdminOverviewEventMetrics;
  cloudRows: AdminOverviewCloudRowsMetrics;
  storage: AdminOverviewStorageMetrics;
}
