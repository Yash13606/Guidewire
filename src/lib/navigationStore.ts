import { create } from "zustand";

interface AppState {
  role: "worker" | "admin";
  isOnboarded: boolean;
  setRole: (role: "worker" | "admin") => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "worker",
  isOnboarded: false,
  setRole: (role) => set({ role }),
  completeOnboarding: () => set({ isOnboarded: true }),
}));
