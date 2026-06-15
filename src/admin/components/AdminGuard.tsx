import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AdminAccessLoading, AdminForbidden, AdminUnavailable } from "@/admin/components/AdminAccessStates";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const location = useLocation();
  const authInitialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const rolesInitialized = useAdminRoleStore((s) => s.initialized);
  const rolesLoading = useAdminRoleStore((s) => s.loading);
  const canAccessAdmin = useAdminRoleStore((s) => s.canAccessAdmin);
  const roleError = useAdminRoleStore((s) => s.error);
  const loadRoles = useAdminRoleStore((s) => s.loadRoles);

  useEffect(() => {
    if (!authInitialized || !user || rolesInitialized || rolesLoading) return;
    void loadRoles();
  }, [authInitialized, loadRoles, rolesInitialized, rolesLoading, user]);

  if (!authInitialized) {
    return <AdminAccessLoading />;
  }

  if (!isSupabaseConfigured) {
    return <AdminUnavailable message="Admin access needs Supabase to be configured." />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }

  if (rolesLoading || !rolesInitialized) {
    return <AdminAccessLoading />;
  }

  if (roleError) {
    return <AdminUnavailable />;
  }

  if (!canAccessAdmin) {
    return <AdminForbidden />;
  }

  return <>{children}</>;
}
