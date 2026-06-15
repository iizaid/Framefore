import { create } from "zustand";
import {
  getCurrentProfile,
  updateCurrentProfile,
  uploadAvatar as uploadAvatarApi,
  removeAvatar as removeAvatarApi,
  getAvatarDisplayUrl,
  type Profile,
  type ProfileInput,
} from "@/lib/profile";
import { useAuthStore } from "@/store/useAuthStore";

// Dedicated profile/account state. Kept entirely separate from the project
// useStore (local-first project data) so the two never leak into each other.
interface ProfileState {
  profile: Profile | null;
  avatarUrl: string | null; // resolved display URL (signed or external)
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  error: string | null;

  loadProfile: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ error: string | null }>;
  removeAvatar: () => Promise<{ error: string | null }>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  avatarUrl: null,
  loading: false,
  saving: false,
  uploading: false,
  error: null,
};

// Resolve the display URL for a profile and store it. Isolated so load/save/
// upload/remove all refresh the avatar consistently.
async function resolveAvatar(profile: Profile | null): Promise<string | null> {
  if (!profile) return null;
  return getAvatarDisplayUrl(profile);
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...initialState,

  loadProfile: async () => {
    // Several components (AccountMenu, ProfilePage, workspace header) may all ask
    // for the profile at once. Collapse those into a single in-flight request so
    // we never fetch the row — or mint the signed avatar URL — more than needed.
    if (get().loading) return;
    set({ loading: true, error: null });
    const { data, error } = await getCurrentProfile();
    if (error) {
      set({ loading: false, error });
      return;
    }
    const avatarUrl = await resolveAvatar(data);
    set({ profile: data, avatarUrl, loading: false });
  },

  saveProfile: async (input) => {
    set({ saving: true, error: null });
    const { data, error } = await updateCurrentProfile(input);
    if (error) {
      set({ saving: false, error });
      return { error };
    }
    set({ profile: data, saving: false });
    return { error: null };
  },

  uploadAvatar: async (file) => {
    set({ uploading: true, error: null });
    const { data, error } = await uploadAvatarApi(file);
    if (error) {
      set({ uploading: false, error });
      return { error };
    }
    const avatarUrl = await resolveAvatar(data);
    set({ profile: data, avatarUrl, uploading: false });
    return { error: null };
  },

  removeAvatar: async () => {
    set({ uploading: true, error: null });
    const { data, error } = await removeAvatarApi();
    if (error) {
      set({ uploading: false, error });
      return { error };
    }
    const avatarUrl = await resolveAvatar(data);
    set({ profile: data, avatarUrl, uploading: false });
    return { error: null };
  },

  clearError: () => set({ error: null }),

  reset: () => set({ ...initialState }),
}));

// Clear all profile state the moment the user signs out, so a second user on the
// same browser never sees the previous user's profile or avatar.
let lastUserId = useAuthStore.getState().user?.id ?? null;
useAuthStore.subscribe((state) => {
  const currentId = state.user?.id ?? null;
  if (currentId !== lastUserId) {
    lastUserId = currentId;
    // On any identity change (sign out, or switch to a different account) drop
    // the cached profile. The Profile page re-loads fresh for the new user.
    useProfileStore.getState().reset();
  }
});
