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
let loadRequestId = 0;

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
      loadRequestId += 1;
      inFlight = null;
      inFlightUserId = null;
      loadedUserId = null;
      set({ ...emptyState(), loading: false, initialized: false, error: null });
      return;
    }

    const state = get();
    if (state.initialized && !state.error && loadedUserId === userId) return;
    if (inFlight && inFlightUserId === userId) return inFlight;

    const isSwitchingUser = loadedUserId !== userId;
    const requestId = ++loadRequestId;
    inFlightUserId = userId;
    inFlight = (async () => {
      if (isSwitchingUser) {
        set({ ...emptyState(), loading: true, initialized: false, error: null });
      } else {
        set({ loading: true, error: null });
      }

      const result = await getCurrentAdminRoles();
      const currentUserId = useAuthStore.getState().user?.id ?? null;

      if (requestId !== loadRequestId) return;

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
    loadRequestId += 1;
    inFlight = null;
    inFlightUserId = null;
    loadedUserId = null;
    set({ ...emptyState(), loading: false, initialized: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
