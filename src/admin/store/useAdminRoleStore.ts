import { create } from "zustand";
import { getCurrentAdminRoles, EMPTY_CURRENT_ADMIN_ROLES } from "@/admin/lib/roles";
import type { AdminRole, CurrentAdminRoles } from "@/admin/types";
import { useAuthStore } from "@/store/useAuthStore";

interface AdminRoleState extends CurrentAdminRoles {
  loading: boolean;
  initialized: boolean;
  error: string | null;
  loadRoles: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

let inFlight: Promise<void> | null = null;
let inFlightUserId: string | null = null;
let loadedUserId: string | null = null;

function emptyState() {
  return {
    ...EMPTY_CURRENT_ADMIN_ROLES,
    roles: [] as AdminRole[],
  };
}

export const useAdminRoleStore = create<AdminRoleState>((set, get) => ({
  ...emptyState(),
  loading: false,
  initialized: false,
  error: null,

  loadRoles: async () => {
    const userId = useAuthStore.getState().user?.id ?? null;

    if (!userId) {
      loadedUserId = null;
      set({ ...emptyState(), loading: false, initialized: true, error: null });
      return;
    }

    const state = get();
    if (state.initialized && !state.error && loadedUserId === userId) return;
    if (inFlight && inFlightUserId === userId) return inFlight;

    inFlightUserId = userId;
    inFlight = (async () => {
      set({ loading: true, error: null });
      const result = await getCurrentAdminRoles();
      const currentUserId = useAuthStore.getState().user?.id ?? null;

      if (currentUserId !== userId) {
        loadedUserId = null;
        set({ ...emptyState(), loading: false, initialized: false, error: null });
        return;
      }

      loadedUserId = userId;
      if (result.error) {
        set({ ...emptyState(), roles: result.data?.roles ?? [], loading: false, initialized: true, error: result.error });
        return;
      }

      set({ ...result.data, loading: false, initialized: true, error: null });
    })().finally(() => {
      if (inFlightUserId === userId) {
        inFlight = null;
        inFlightUserId = null;
      }
    });

    return inFlight;
  },

  reset: () => {
    inFlight = null;
    inFlightUserId = null;
    loadedUserId = null;
    set({ ...emptyState(), loading: false, initialized: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
