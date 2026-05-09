import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
  uid: string;
  fullName: string;
  photoURL: string;
  onboarded: boolean;
}

interface AppState {
  profile: UserProfile | null;
  activeChatId: string | null;
  notificationsEnabled: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setActiveChat: (chatId: string | null) => void;
  setNotifications: (enabled: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      activeChatId: null,
      notificationsEnabled: false,
      setProfile: (profile) => set({ profile }),
      setActiveChat: (activeChatId) => set({ activeChatId }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: "vivah-storage",
    }
  )
);
