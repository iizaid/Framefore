import { create } from "zustand";
import { loadAdminOverviewMetrics } from "@/admin/lib/overview";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import type { AdminOverviewMetrics } from "@/admin/types";
import { useAuthStore } from "@/store/useAuthStore";

interface AdminOverviewState {
  data: AdminOverviewMetrics | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  unavailable: boolean;
  lastLoadedAt: string | null;
  loadOverview: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

let inFlight: Promise<void> | null = null;
let inFlightUserId: string | null = null;
let loadedUserId: string | null = null;
let overviewRequestId = 0;

function emptyOverviewState() {
  return {
    data: null,
    loading: false,
    initialized: false,
    error: null,
    unavailable: false,
    lastLoadedAt: null,
  };
}

async function loadForCurrentUser(
  set: (state: Partial<AdminOverviewState>) => void,
  get: () => AdminOverviewState,
  force = false
) {
  const userId = useAuthStore.getState().user?.id ?? null;
  const canAccessAdmin = useAdminRoleStore.getState().canAccessAdmin;

  if (!userId || !canAccessAdmin) {
    overviewRequestId += 1;
    inFlight = null;
    inFlightUserId = null;
    loadedUserId = null;
    set(emptyOverviewState());
    return;
  }

  if (!force && loadedUserId === userId) return;
  if (inFlight && inFlightUserId === userId) return inFlight;

  const isSwitchingUser = loadedUserId !== userId;
  const requestId = ++overviewRequestId;
  inFlightUserId = userId;
  inFlight = (async () => {
    set(isSwitchingUser ? { ...emptyOverviewState(), loading: true } : { loading: true, error: null, unavailable: false });

    const result = await loadAdminOverviewMetrics();
    const currentUserId = useAuthStore.getState().user?.id ?? null;
    const currentCanAccessAdmin = useAdminRoleStore.getState().canAccessAdmin;

    if (requestId !== overviewRequestId) return;

    if (currentUserId !== userId || !currentCanAccessAdmin) {
      loadedUserId = null;
      set(emptyOverviewState());
      return;
    }

    loadedUserId = userId;
    const previous = get();
    set({
      data: result.data ?? previous.data,
      loading: false,
      initialized: true,
      error: result.error,
      unavailable: Boolean(result.unavailable),
      lastLoadedAt: result.data ? new Date().toISOString() : previous.lastLoadedAt,
    });
  })().finally(() => {
    if (inFlightUserId === userId) {
      inFlight = null;
      inFlightUserId = null;
    }
  });

  return inFlight;
}

export const useAdminOverviewStore = create<AdminOverviewState>((set, get) => ({
  ...emptyOverviewState(),

  loadOverview: async () => {
    await loadForCurrentUser(set, get, false);
  },

  refresh: async () => {
    await loadForCurrentUser(set, get, true);
  },

  reset: () => {
    overviewRequestId += 1;
    inFlight = null;
    inFlightUserId = null;
    loadedUserId = null;
    set(emptyOverviewState());
  },

  clearError: () => set({ error: null, unavailable: false }),
}));
