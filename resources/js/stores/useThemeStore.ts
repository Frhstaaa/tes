import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = window.localStorage.getItem('meetingkeun_theme');
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', initial);
  }
  return {
    dark: initial,
    toggle: () =>
      set((state) => {
        const next = !state.dark;
        document.documentElement.classList.toggle('dark', next);
        window.localStorage.setItem('meetingkeun_theme', next ? 'dark' : 'light');
        return { dark: next };
      }),
    setDark: (dark) => {
      document.documentElement.classList.toggle('dark', dark);
      window.localStorage.setItem('meetingkeun_theme', dark ? 'dark' : 'light');
      set({ dark });
    },
  };
});
